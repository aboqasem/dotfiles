import { afterEach, describe, expect, it, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { IntegrationFixture } from "./harness";

setDefaultTimeout(15_000);

describe("symlink files", () => {
	let fixture: IntegrationFixture | undefined;

	afterEach(() => fixture?.cleanup());

	async function setup(itemPath = ".managed"): Promise<IntegrationFixture> {
		fixture = await IntegrationFixture.create([{ name: "Files", items: [{ type: "symlink", paths: [itemPath] }] }]);
		return fixture;
	}

	it("creates a dangling link when neither source nor target exists", async () => {
		const env = await setup();
		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(env.homePath(".managed")).isSymbolicLink()).toBeTrue();
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
		expect(fs.existsSync(env.sourcePath(".managed"))).toBeFalse();
	});

	it("links an existing source when the target is missing", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
		expect(fs.readFileSync(env.homePath(".managed"), "utf8")).toBe("repo\n");
	});

	it("adopts a target when the source is missing", async () => {
		const env = await setup();
		env.writeFile(env.homePath(".managed"), "home\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readFileSync(env.sourcePath(".managed"), "utf8")).toBe("home\n");
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
	});

	it("leaves a correct link unchanged across repeated runs", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		env.writeSymlink(env.sourcePath(".managed"), env.homePath(".managed"));

		const first = await env.run(["--do"]);
		const second = await env.run(["--do"]);

		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(first.stdout).toContain("Already symlinked.");
		expect(second.stdout).toContain("Already symlinked.");
		expect(env.backupsFor(env.sourcePath(".managed"))).toEqual([]);
	});

	it("replaces a link pointing somewhere else", async () => {
		const env = await setup();
		const other = path.join(env.root, "other");
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		env.writeFile(other, "other\n");
		env.writeSymlink(other, env.homePath(".managed"));

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Overriding symlink:");
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
	});

	it.todo("repairs a broken target link", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		env.writeSymlink(path.join(env.root, "missing"), env.homePath(".managed"));

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
	});

	it("canonicalizes an equivalent relative link to the configured absolute source", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		const relative = path.relative(path.dirname(env.homePath(".managed")), env.sourcePath(".managed"));
		env.writeSymlink(relative, env.homePath(".managed"));

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
		expect(result.stdout).toContain("Overriding symlink:");
	});

	it("replaces equal real files without creating a backup", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "same\n");
		env.writeFile(env.homePath(".managed"), "same\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("No diff.");
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
		expect(env.backupsFor(env.sourcePath(".managed"))).toEqual([]);
	});

	it("adopts a differing target over a tracked-clean source without a backup", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		await env.commitAll();
		env.writeFile(env.homePath(".managed"), "home\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Diff found but is tracked.");
		expect(fs.readFileSync(env.sourcePath(".managed"), "utf8")).toBe("home\n");
		expect(fs.readlinkSync(env.homePath(".managed"))).toBe(env.sourcePath(".managed"));
		expect(env.backupsFor(env.sourcePath(".managed"))).toEqual([]);
	});

	it("backs up a dirty source before adopting a differing target", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "committed\n");
		await env.commitAll();
		env.writeFile(env.sourcePath(".managed"), "dirty\n");
		env.writeFile(env.homePath(".managed"), "home\n");

		const result = await env.run(["--do"]);
		const backups = env.backupsFor(env.sourcePath(".managed"));
		const backup = backups[0];

		expect(result.exitCode).toBe(0);
		expect(backups).toHaveLength(1);
		expect(backup).toBeDefined();
		if (!backup) throw new Error("Expected a backup");
		expect(fs.readFileSync(backup, "utf8")).toBe("dirty\n");
		expect(fs.readFileSync(env.sourcePath(".managed"), "utf8")).toBe("home\n");
		expect(result.stdout).toContain("Backed up paths:");
	});

	it("backs up an untracked source before adopting a differing target", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "untracked\n");
		env.writeFile(env.homePath(".managed"), "home\n");

		const result = await env.run(["--do"]);
		const backups = env.backupsFor(env.sourcePath(".managed"));
		const backup = backups[0];

		expect(result.exitCode).toBe(0);
		expect(backups).toHaveLength(1);
		expect(backup).toBeDefined();
		if (!backup) throw new Error("Expected a backup");
		expect(fs.readFileSync(backup, "utf8")).toBe("untracked\n");
		expect(fs.readFileSync(env.sourcePath(".managed"), "utf8")).toBe("home\n");
	});

	it("does not create another backup on an idempotent rerun", async () => {
		const env = await setup();
		env.writeFile(env.sourcePath(".managed"), "repo\n");
		env.writeFile(env.homePath(".managed"), "home\n");

		expect((await env.run(["--do"])).exitCode).toBe(0);
		expect((await env.run(["--do"])).exitCode).toBe(0);

		expect(env.backupsFor(env.sourcePath(".managed"))).toHaveLength(1);
	});

	it("rejects a directory where a file is configured", async () => {
		const env = await setup();
		env.writeDirectory(env.sourcePath(".managed"));

		const result = await env.run(["--do"]);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Expected file");
		expect(fs.lstatSync(env.sourcePath(".managed")).isDirectory()).toBeTrue();
		expect(fs.existsSync(env.homePath(".managed"))).toBeFalse();
	});

	it("rejects a path that escapes its managed roots", async () => {
		const env = await setup("../outside/escaped");
		const escaped = path.join(env.outside, "escaped");
		env.writeFile(escaped, "outside\n");

		const result = await env.run(["--do"]);

		expect(result.exitCode).not.toBe(0);
		expect(fs.lstatSync(escaped).isFile()).toBeTrue();
		expect(fs.readFileSync(escaped, "utf8")).toBe("outside\n");
	});

	it.todo("diffs shell-sensitive paths without corrupting the comparison", async () => {
		const itemPath = ".managed'quote";
		const env = await setup(itemPath);
		env.writeFile(env.sourcePath(itemPath), "repo\n");
		env.writeFile(env.homePath(itemPath), "home\n");

		const result = await env.run();

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("-repo");
		expect(result.stdout).toContain("+home");
	});

	it.todo("rolls back adoption when link creation fails", async () => {
		const env = await setup();
		env.writeFile(env.homePath(".managed"), "home\n");
		env.failCommand("ln");

		const result = await env.run(["--do"]);

		expect(result.exitCode).not.toBe(0);
		expect(fs.readFileSync(env.homePath(".managed"), "utf8")).toBe("home\n");
		expect(fs.existsSync(env.sourcePath(".managed"))).toBeFalse();
	});
});
