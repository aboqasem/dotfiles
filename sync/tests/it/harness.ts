import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WORKSPACE_ROOT = path.resolve(import.meta.dir, "../../..");
const SYNC_SOURCE = path.join(WORKSPACE_ROOT, "sync", "src");
const NODE_MODULES = path.join(WORKSPACE_ROOT, "node_modules");

export type ConfigItem =
	| {
			type: "symlink";
			paths: Array<string | { path: string; type: "file" | "dir" }>;
	  }
	| {
			type: "defaults";
			domains: Array<string | { domain: string; include?: string[]; exclude?: string[] }>;
	  };

export type ConfigGroup = {
	name: string;
	items: ConfigItem[];
};

export type RunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type RunOptions = {
	env?: Record<string, string>;
};

function tomlString(value: string): string {
	return JSON.stringify(value);
}

function tomlStrings(values: string[]): string {
	return `[${values.map(tomlString).join(", ")}]`;
}

export function buildConfig(groups: ConfigGroup[]): string {
	const lines: string[] = [];

	for (const group of groups) {
		lines.push("[[groups]]", `name = ${tomlString(group.name)}`);
		for (const item of group.items) {
			lines.push("[[groups.items]]", `type = ${tomlString(item.type)}`);
			if (item.type === "symlink") {
				const paths = item.paths.map((entry) => {
					if (typeof entry === "string") return tomlString(entry);
					return `[${tomlString(entry.path)}, { type = ${tomlString(entry.type)} }]`;
				});
				lines.push(`paths = [${paths.join(", ")},]`);
			} else {
				const domains = item.domains.map((entry) => {
					if (typeof entry === "string") return tomlString(entry);
					const options: string[] = [];
					if (entry.include) options.push(`include = ${tomlStrings(entry.include)}`);
					if (entry.exclude) options.push(`exclude = ${tomlStrings(entry.exclude)}`);
					return `[${tomlString(entry.domain)}, { ${options.join(", ")} }]`;
				});
				lines.push(`domains = [${domains.join(", ")},]`);
			}
		}
	}

	return `${lines.join("\n")}\n`;
}

async function spawn(
	command: string[],
	{ cwd, env }: { cwd: string; env?: Record<string, string | undefined> },
): Promise<RunResult> {
	const child = Bun.spawn(command, {
		cwd,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { stdout, stderr, exitCode };
}

const FAKE_DEFAULTS = `#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";

const stateDir = process.env.TEST_DEFAULTS_DIR;
if (!stateDir) throw new Error("TEST_DEFAULTS_DIR is required");
const [action, domain, input] = process.argv.slice(2);
fs.appendFileSync(path.join(stateDir, "calls.jsonl"), JSON.stringify({ action, domain, input }) + "\\n");
if (process.env.TEST_DEFAULTS_FAIL === action + ":" + domain) {
	process.stderr.write("injected defaults failure\\n");
	process.exit(72);
}
const statePath = path.join(stateDir, encodeURIComponent(domain ?? "") + ".plist");
if (action === "export") {
	if (!fs.existsSync(statePath)) {
		process.stderr.write("domain not found\\n");
		process.exit(1);
	}
	process.stdout.write(fs.readFileSync(statePath));
} else if (action === "import" && input) {
	fs.copyFileSync(input, statePath);
} else {
	process.stderr.write("unsupported defaults invocation\\n");
	process.exit(2);
}
`;

export class IntegrationFixture {
	readonly root: string;
	readonly repo: string;
	readonly home: string;
	readonly bin: string;
	readonly defaultsState: string;
	readonly outside: string;

	private constructor(root: string) {
		this.root = root;
		this.repo = path.join(root, "repo");
		this.home = path.join(root, "home");
		this.bin = path.join(root, "bin");
		this.defaultsState = path.join(root, "defaults-state");
		this.outside = path.join(root, "outside");
	}

	static async create(groups: ConfigGroup[]): Promise<IntegrationFixture> {
		const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "dotsync-it-"));
		const fixture = new IntegrationFixture(root);
		for (const dir of [fixture.repo, fixture.home, fixture.bin, fixture.defaultsState, fixture.outside]) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.mkdirSync(path.join(fixture.repo, "sync"), { recursive: true });
		fs.cpSync(SYNC_SOURCE, path.join(fixture.repo, "sync", "src"), { recursive: true });
		fs.symlinkSync(NODE_MODULES, path.join(fixture.repo, "node_modules"), "dir");
		fs.writeFileSync(path.join(fixture.repo, "syncconf.toml"), buildConfig(groups));
		fs.writeFileSync(path.join(fixture.repo, ".gitignore"), "synced/**/*.bak\nnode_modules\n");
		fixture.writeExecutable("defaults", FAKE_DEFAULTS);

		await fixture.git("init", "--quiet");
		await fixture.git("config", "user.name", "Dotfiles Test");
		await fixture.git("config", "user.email", "dotfiles-test@example.invalid");
		await fixture.git("add", "sync", "syncconf.toml", ".gitignore");
		await fixture.git("commit", "--quiet", "-m", "test fixture");
		return fixture;
	}

	sourcePath(relativePath: string): string {
		return path.resolve(this.repo, "synced", "symlink", relativePath);
	}

	homePath(relativePath: string): string {
		return path.resolve(this.home, relativePath);
	}

	defaultsPath(domain: string): string {
		return path.join(this.repo, "synced", "defaults", `${domain}.plist`);
	}

	defaultsStatePath(domain: string): string {
		return path.join(this.defaultsState, `${encodeURIComponent(domain)}.plist`);
	}

	writeFile(filePath: string, contents: string): void {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, contents);
	}

	writeDirectory(directoryPath: string, files: Record<string, string> = {}): void {
		fs.mkdirSync(directoryPath, { recursive: true });
		for (const [relativePath, contents] of Object.entries(files)) {
			this.writeFile(path.join(directoryPath, relativePath), contents);
		}
	}

	writeSymlink(target: string, linkPath: string): void {
		fs.mkdirSync(path.dirname(linkPath), { recursive: true });
		fs.symlinkSync(target, linkPath);
	}

	writeExecutable(name: string, contents: string): void {
		const executable = path.join(this.bin, name);
		fs.writeFileSync(executable, contents);
		fs.chmodSync(executable, 0o755);
	}

	failCommand(name: string): void {
		this.writeExecutable(
			name,
			"#!/usr/bin/env bun\nprocess.stderr.write('injected command failure\\n'); process.exit(73);\n",
		);
	}

	setDefaults(domain: string, plist: string): void {
		this.writeFile(this.defaultsStatePath(domain), plist);
	}

	defaultsCalls(): Array<{ action: string; domain: string; input?: string }> {
		const callsPath = path.join(this.defaultsState, "calls.jsonl");
		if (!fs.existsSync(callsPath)) return [];
		return fs
			.readFileSync(callsPath, "utf8")
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line) as { action: string; domain: string; input?: string });
	}

	async git(...args: string[]): Promise<RunResult> {
		const result = await spawn(["git", ...args], { cwd: this.repo, env: process.env });
		if (result.exitCode !== 0) {
			throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
		}
		return result;
	}

	async commitAll(message = "fixture state"): Promise<void> {
		await this.git("add", "--all");
		await this.git("commit", "--quiet", "-m", message);
	}

	run(args: string[] = [], options: RunOptions = {}): Promise<RunResult> {
		const main = path.join(this.repo, "sync", "src", "index.ts");
		return spawn([process.execPath, "run", main, "--", ...args], {
			cwd: this.repo,
			env: {
				...process.env,
				HOME: this.home,
				PATH: `${this.bin}${path.delimiter}${process.env.PATH ?? ""}`,
				NO_COLOR: "1",
				FORCE_COLOR: "0",
				TEST_DEFAULTS_DIR: this.defaultsState,
				...options.env,
			},
		});
	}

	backupsFor(sourcePath: string): string[] {
		const directory = path.dirname(sourcePath);
		const basename = `${path.basename(sourcePath)}.`;
		if (!fs.existsSync(directory)) return [];
		return fs
			.readdirSync(directory)
			.filter((entry) => entry.startsWith(basename) && entry.endsWith(".bak"))
			.map((entry) => path.join(directory, entry));
	}

	cleanup(): void {
		fs.rmSync(this.root, { recursive: true, force: true });
	}
}

export const EMPTY_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
`;

export function plistWith(values: Record<string, string | boolean>): string {
	const entries = Object.entries(values)
		.map(([key, value]) => {
			const serialized = typeof value === "boolean" ? `<${value}/>` : `<string>${value}</string>`;
			return `\t<key>${key}</key>\n\t${serialized}`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${entries}
</dict>
</plist>
`;
}
