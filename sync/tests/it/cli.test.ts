import { afterEach, describe, expect, it, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import { IntegrationFixture, plistWith } from "./harness";

setDefaultTimeout(15_000);

describe("CLI selection and dry-run behavior", () => {
	let fixture: IntegrationFixture | undefined;

	afterEach(() => fixture?.cleanup());

	async function setupGroups(): Promise<IntegrationFixture> {
		fixture = await IntegrationFixture.create([
			{ name: "Alpha", items: [{ type: "symlink", paths: [".alpha"] }] },
			{ name: "Beta", items: [{ type: "symlink", paths: [".beta"] }] },
		]);
		fixture.writeFile(fixture.homePath(".alpha"), "alpha\n");
		fixture.writeFile(fixture.homePath(".beta"), "beta\n");
		return fixture;
	}

	it("runs all configured groups by default", async () => {
		const env = await setupGroups();

		const result = await env.run(["--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.readlinkSync(env.homePath(".alpha"))).toBe(env.sourcePath(".alpha"));
		expect(fs.readlinkSync(env.homePath(".beta"))).toBe(env.sourcePath(".beta"));
	});

	it("selects groups explicitly", async () => {
		const env = await setupGroups();

		const result = await env.run(["--groups", "Alpha", "--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(env.homePath(".alpha")).isSymbolicLink()).toBeTrue();
		expect(fs.lstatSync(env.homePath(".beta")).isFile()).toBeTrue();
		expect(result.stdout).toContain("Skipping Beta");
	});

	it("gives group exclusion precedence over inclusion", async () => {
		const env = await setupGroups();

		const result = await env.run(["--groups", "Alpha", "Beta", "--exclude-groups", "Beta", "--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(env.homePath(".alpha")).isSymbolicLink()).toBeTrue();
		expect(fs.lstatSync(env.homePath(".beta")).isFile()).toBeTrue();
	});

	it("selects and excludes item types", async () => {
		fixture = await IntegrationFixture.create([
			{
				name: "Mixed",
				items: [
					{ type: "symlink", paths: [".file"] },
					{ type: "defaults", domains: ["com.example.Mixed"] },
				],
			},
		]);
		fixture.writeFile(fixture.homePath(".file"), "home\n");
		fixture.setDefaults("com.example.Mixed", plistWith({ enabled: true }));

		const selected = await fixture.run(["--types", "symlink", "--do"]);

		expect(selected.exitCode).toBe(0);
		expect(fs.lstatSync(fixture.homePath(".file")).isSymbolicLink()).toBeTrue();
		expect(fixture.defaultsCalls()).toEqual([]);
		expect(fs.existsSync(fixture.defaultsPath("com.example.Mixed"))).toBeFalse();
	});

	it("gives type exclusion precedence over inclusion", async () => {
		fixture = await IntegrationFixture.create([{ name: "Files", items: [{ type: "symlink", paths: [".file"] }] }]);
		fixture.writeFile(fixture.homePath(".file"), "home\n");

		const result = await fixture.run(["--types", "symlink", "--exclude-types", "symlink", "--do"]);

		expect(result.exitCode).toBe(0);
		expect(fs.lstatSync(fixture.homePath(".file")).isFile()).toBeTrue();
		expect(fs.existsSync(fixture.sourcePath(".file"))).toBeFalse();
	});

	it("rejects invalid group, type, and defaults action choices", async () => {
		const env = await setupGroups();

		const invalidGroup = await env.run(["--groups", "Missing"]);
		const invalidType = await env.run(["--types", "copy"]);
		const invalidAction = await env.run(["--defaults-action", "merge"]);

		expect(invalidGroup.exitCode).not.toBe(0);
		expect(invalidType.exitCode).not.toBe(0);
		expect(invalidAction.exitCode).not.toBe(0);
		expect(invalidGroup.stderr).toContain("Allowed choices");
		expect(invalidType.stderr).toContain("Allowed choices");
		expect(invalidAction.stderr).toContain("Allowed choices");
	});

	it("does not mutate files, links, or backups during dry run", async () => {
		const env = await setupGroups();

		const result = await env.run();

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("DRY RUN");
		expect(result.stdout).toContain("Nothing was actually done");
		expect(fs.lstatSync(env.homePath(".alpha")).isFile()).toBeTrue();
		expect(fs.lstatSync(env.homePath(".beta")).isFile()).toBeTrue();
		expect(fs.existsSync(env.sourcePath(".alpha"))).toBeFalse();
		expect(fs.existsSync(env.sourcePath(".beta"))).toBeFalse();
		expect(env.backupsFor(env.sourcePath(".alpha"))).toEqual([]);
	});

	it("shows diffs by default and suppresses them with --no-diff", async () => {
		fixture = await IntegrationFixture.create([{ name: "Files", items: [{ type: "symlink", paths: [".file"] }] }]);
		fixture.writeFile(fixture.sourcePath(".file"), "repo\n");
		fixture.writeFile(fixture.homePath(".file"), "home\n");

		const shown = await fixture.run();
		const hidden = await fixture.run(["--no-diff"]);

		expect(shown.exitCode).toBe(0);
		expect(shown.stdout).toContain("-repo");
		expect(shown.stdout).toContain("+home");
		expect(hidden.exitCode).toBe(0);
		expect(hidden.stdout).not.toContain("-repo");
		expect(hidden.stdout).not.toContain("+home");
		expect(hidden.stdout).toContain("Diff found.");
	});
});
