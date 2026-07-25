import { afterEach, describe, expect, it, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { IntegrationFixture } from "./harness";

setDefaultTimeout(15_000);

describe("symlink directories", () => {
	let fixture: IntegrationFixture | undefined;

	afterEach(() => fixture?.cleanup());

	async function setup(): Promise<IntegrationFixture> {
		fixture = await IntegrationFixture.create([
			{
				name: "Directories",
				items: [{ type: "symlink", paths: [{ path: ".managed-dir", type: "dir" }] }],
			},
		]);
		return fixture;
	}

	it("creates an empty source and link when neither side exists", async () => {
		const env = await setup();

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(env.sourcePath(".managed-dir")).isDirectory()).toBeTrue();
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
	});

	it("links an existing source directory", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { "nested/config": "repo\n" });

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readFileSync(path.join(env.homePath(".managed-dir"), "nested/config"), "utf8")).toBe("repo\n");
	});

	it("adopts an existing target directory without nesting it", async () => {
		const env = await setup();
		env.writeDirectory(env.homePath(".managed-dir"), { "nested/config": "home\n" });

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readFileSync(path.join(env.sourcePath(".managed-dir"), "nested/config"), "utf8")).toBe("home\n");
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
	});

	it("leaves a correct directory link unchanged", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { config: "repo\n" });
		env.writeSymlink(env.sourcePath(".managed-dir"), env.homePath(".managed-dir"));

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Already symlinked.");
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
	});

	it("backs up a dirty source directory before adopting the target tree", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { config: "committed\n" });
		await env.commitAll();
		env.writeFile(path.join(env.sourcePath(".managed-dir"), "config"), "dirty\n");
		env.writeDirectory(env.homePath(".managed-dir"), { config: "home\n", "nested/value": "new\n" });

		const result = await env.run(["--do"]);
		const backups = env.backupsFor(env.sourcePath(".managed-dir"));
		const backup = backups[0];

		expect(result.exitCode).toBe(0);
		expect(backups).toHaveLength(1);
		expect(backup).toBeDefined();
		if (!backup) throw new Error("Expected a backup");
		expect(fs.readFileSync(path.join(backup, "config"), "utf8")).toBe("dirty\n");
		expect(fs.readFileSync(path.join(env.sourcePath(".managed-dir"), "config"), "utf8")).toBe("home\n");
		expect(fs.readFileSync(path.join(env.sourcePath(".managed-dir"), "nested/value"), "utf8")).toBe("new\n");
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
	});

	it("rejects a file where a directory is configured", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed-dir"), "file\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Expected dir");
		expect(fs.readFileSync(env.sourcePath(".managed-dir"), "utf8")).toBe("file\n");
		expect(fs.existsSync(env.homePath(".managed-dir"))).toBeFalse();
	});

	it("replaces equal real directories without nesting a link", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { config: "same\n" });
		env.writeDirectory(env.homePath(".managed-dir"), { config: "same\n" });

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(env.homePath(".managed-dir")).isSymbolicLink()).toBeTrue();
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
		expect(fs.existsSync(path.join(env.homePath(".managed-dir"), ".managed-dir"))).toBeFalse();
	});

	it("adopts a differing directory over a tracked-clean source without nesting", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { config: "repo\n" });
		await env.commitAll();
		env.writeDirectory(env.homePath(".managed-dir"), { config: "home\n" });

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readFileSync(path.join(env.sourcePath(".managed-dir"), "config"), "utf8")).toBe("home\n");
		expect(fs.existsSync(path.join(env.sourcePath(".managed-dir"), ".managed-dir"))).toBeFalse();
		expect(fs.readlinkSync(env.homePath(".managed-dir"))).toBe(env.sourcePath(".managed-dir"));
	});

	it("backs up a tracked directory containing untracked descendants", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed-dir"), { tracked: "repo\n" });
		await env.commitAll();
		env.writeFile(path.join(env.sourcePath(".managed-dir"), "untracked"), "important\n");
		env.writeDirectory(env.homePath(".managed-dir"), { tracked: "home\n" });

		const result = await env.run(["--do"]);
		const backups = env.backupsFor(env.sourcePath(".managed-dir"));
		const backup = backups[0];

		expect(result.exitCode).toBe(0);
		expect(backups).toHaveLength(1);
		expect(backup).toBeDefined();
		if (!backup) throw new Error("Expected a backup");
		expect(fs.readFileSync(path.join(backup, "untracked"), "utf8")).toBe("important\n");
	});
});
