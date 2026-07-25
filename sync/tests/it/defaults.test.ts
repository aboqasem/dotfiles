import { afterEach, describe, expect, it, setDefaultTimeout } from "bun:test";
import fs from "node:fs";
import plist from "plist";
import { EMPTY_PLIST, IntegrationFixture, plistWith } from "./harness";

setDefaultTimeout(15_000);

describe("macOS defaults", () => {
	const domain = "com.example.Application";
	let fixture: IntegrationFixture | undefined;

	afterEach(() => fixture?.cleanup());

	async function setup(options: { include?: string[]; exclude?: string[] } = {}): Promise<IntegrationFixture> {
		fixture = await IntegrationFixture.create([
			{
				name: "Application",
				items: [
					{
						type: "defaults",
						domains: [{ domain, ...options }],
					},
				],
			},
		]);
		return fixture;
	}

	describe("export", () => {
		it("exports and normalizes a new domain plist", async () => {
			const env = await setup();
			env.setDefaults(domain, plistWith({ enabled: true, theme: "dark" }));

			const result = await env.run(["--do"]);
			const stored = fs.readFileSync(env.defaultsPath(domain), "utf8");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Exporting defaults");
			expect(plist.parse(stored)).toEqual({ enabled: true, theme: "dark" });
			expect(stored.endsWith("\n")).toBeTrue();
			expect(stored.endsWith("\n\n")).toBeFalse();
			expect(env.defaultsCalls()).toEqual([{ action: "export", domain, input: "-" }]);
		});

		it("skips an empty exported domain", async () => {
			const env = await setup();
			env.setDefaults(domain, EMPTY_PLIST);

			const result = await env.run(["--do"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Nothing to export.");
			expect(fs.existsSync(env.defaultsPath(domain))).toBeFalse();
		});

		it("applies include filters before storing the plist", async () => {
			const env = await setup({ include: ["#/keep"] });
			env.setDefaults(domain, plistWith({ keep: "yes", remove: "no" }));

			const result = await env.run(["--do"]);

			expect(result.exitCode).toBe(0);
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ keep: "yes" });
		});

		it("applies exclude filters before storing the plist", async () => {
			const env = await setup({ exclude: ["#/remove"] });
			env.setDefaults(domain, plistWith({ keep: "yes", remove: "no" }));

			const result = await env.run(["--do"]);

			expect(result.exitCode).toBe(0);
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ keep: "yes" });
		});

		it("applies include and then exclude filters", async () => {
			const env = await setup({ include: ["#/*"], exclude: ["#/remove"] });
			env.setDefaults(domain, plistWith({ keep: "yes", remove: "no" }));

			const result = await env.run(["--do"]);

			expect(result.exitCode).toBe(0);
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ keep: "yes" });
		});

		it("leaves an unchanged normalized plist untouched", async () => {
			const env = await setup();
			env.setDefaults(domain, plistWith({ enabled: true }));
			expect((await env.run(["--do"])).exitCode).toBe(0);
			const before = fs.statSync(env.defaultsPath(domain));

			const result = await env.run(["--do"]);
			const after = fs.statSync(env.defaultsPath(domain));

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("No change.");
			expect(after.ino).toBe(before.ino);
			expect(after.mtimeMs).toBe(before.mtimeMs);
		});

		it("overwrites a changed tracked-clean plist without a backup", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "old" }));
			await env.commitAll();
			env.setDefaults(domain, plistWith({ theme: "new" }));

			const result = await env.run(["--do"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Diff found but is tracked.");
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ theme: "new" });
			expect(env.backupsFor(env.defaultsPath(domain))).toEqual([]);
		});

		it("backs up a dirty plist before overwriting it", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "committed" }));
			await env.commitAll();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "dirty" }));
			env.setDefaults(domain, plistWith({ theme: "new" }));

			const result = await env.run(["--do"]);
			const backups = env.backupsFor(env.defaultsPath(domain));
			const backup = backups[0];

			expect(result.exitCode).toBe(0);
			expect(backups).toHaveLength(1);
			expect(backup).toBeDefined();
			if (!backup) throw new Error("Expected a backup");
			expect(plist.parse(fs.readFileSync(backup, "utf8"))).toEqual({ theme: "dirty" });
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ theme: "new" });
		});

		it("reads live defaults but does not write repository state during dry run", async () => {
			const env = await setup();
			env.setDefaults(domain, plistWith({ enabled: true }));

			const result = await env.run();

			expect(result.exitCode).toBe(0);
			expect(env.defaultsCalls()).toEqual([{ action: "export", domain, input: "-" }]);
			expect(fs.existsSync(env.defaultsPath(domain))).toBeFalse();
		});

		it("stops with existing repository state intact when export fails", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "existing" }));

			const result = await env.run(["--do"], {
				env: { TEST_DEFAULTS_FAIL: `export:${domain}` },
			});

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain("injected defaults failure");
			expect(plist.parse(fs.readFileSync(env.defaultsPath(domain), "utf8"))).toEqual({ theme: "existing" });
			expect(env.backupsFor(env.defaultsPath(domain))).toEqual([]);
		});
	});

	describe("import", () => {
		it("imports an existing stored plist into the domain", async () => {
			const env = await setup();
			const stored = plistWith({ enabled: true, theme: "stored" });
			env.writeFile(env.defaultsPath(domain), stored);
			env.setDefaults(domain, plistWith({ enabled: false }));

			const result = await env.run(["--defaults-action", "import", "--do"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Importing defaults");
			expect(plist.parse(fs.readFileSync(env.defaultsStatePath(domain), "utf8"))).toEqual({
				enabled: true,
				theme: "stored",
			});
			expect(env.defaultsCalls()).toEqual([{ action: "import", domain, input: env.defaultsPath(domain) }]);
		});

		it("skips import when the stored plist is missing", async () => {
			const env = await setup();

			const result = await env.run(["--defaults-action", "import", "--do"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Does not exist.");
			expect(result.stdout).toContain("Skipping");
			expect(env.defaultsCalls()).toEqual([]);
		});

		it("reports import without changing the domain during dry run", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "stored" }));
			env.setDefaults(domain, plistWith({ theme: "live" }));

			const result = await env.run(["--defaults-action", "import"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Importing defaults");
			expect(env.defaultsCalls()).toEqual([]);
			expect(plist.parse(fs.readFileSync(env.defaultsStatePath(domain), "utf8"))).toEqual({ theme: "live" });
		});

		it("does not import an excluded defaults group", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "stored" }));
			env.setDefaults(domain, plistWith({ theme: "live" }));

			const result = await env.run(["--exclude-groups", "Application", "--defaults-action", "import", "--do"]);

			expect(result.exitCode).toBe(0);
			expect(env.defaultsCalls()).toEqual([]);
			expect(plist.parse(fs.readFileSync(env.defaultsStatePath(domain), "utf8"))).toEqual({ theme: "live" });
		});

		it("returns non-zero when import fails", async () => {
			const env = await setup();
			env.writeFile(env.defaultsPath(domain), plistWith({ theme: "stored" }));
			env.setDefaults(domain, plistWith({ theme: "live" }));

			const result = await env.run(["--defaults-action", "import", "--do"], {
				env: { TEST_DEFAULTS_FAIL: `import:${domain}` },
			});

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain("injected defaults failure");
			expect(plist.parse(fs.readFileSync(env.defaultsStatePath(domain), "utf8"))).toEqual({ theme: "live" });
		});
	});
});
