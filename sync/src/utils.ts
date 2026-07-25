import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { remove as removePointer, removeUndefinedItems } from "@sagold/json-pointer";
import { get, set } from "@sagold/json-query";
import { $ } from "bun";
import chalk from "chalk";

namespace utils {
	export function panic(message: string): never {
		throw new Error(message);
	}

	export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
		if (!condition) {
			panic(message);
		}
	}

	export function resolveContainedOrFail(root: string, configuredPath: string): string {
		if (path.isAbsolute(configuredPath)) {
			throw new Error(`Expected a relative path within '${root}', received '${configuredPath}'`);
		}

		const resolved = path.resolve(root, configuredPath);
		const relative = path.relative(root, resolved);
		if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
			throw new Error(`Path '${configuredPath}' escapes managed root '${root}'`);
		}
		return resolved;
	}

	type Processed<T extends Record<string, unknown> | unknown[]> = {
		[P in keyof T]?: T[P] extends Record<string, unknown> | unknown[] ? Processed<T[P]> : T[P] | null;
	};

	export function keep<T extends Record<string, unknown> | unknown[]>(
		data: T,
		queries: string | string[],
	): Processed<T> {
		if (typeof queries === "string") {
			queries = [queries];
		}

		let kept = (Array.isArray(data) ? [] : {}) as Processed<T>;
		for (const query of queries) {
			const ptrs: Record<string, unknown> = get(data, query, get.MAP);
			for (const ptr in ptrs) {
				kept = set(kept, ptr.substring(1), ptrs[ptr]);
			}
		}

		return kept;
	}

	// https://github.com/sagold/json-query/blob/03792d246802500279e1f9f482ce048ff2909c48/lib/interpreter/keys.ts
	const PARENT_INDEX = 2;
	const POINTER_INDEX = 3;
	// https://github.com/sagold/json-query/blob/03792d246802500279e1f9f482ce048ff2909c48/lib/remove.ts
	export function remove<T extends Record<string, unknown> | unknown[]>(
		data: T,
		queries: string | string[],
	): Processed<T> {
		if (typeof queries === "string") {
			queries = [queries];
		}

		const kept: Processed<T> = structuredClone(data);
		for (const query of queries) {
			const ptrs = get(kept, query, get.ALL);
			for (const ptr of ptrs) {
				removePointer(kept, ptr[POINTER_INDEX], true);
			}
			for (const ptr of ptrs) {
				const parent = ptr[PARENT_INDEX];
				if (Array.isArray(parent)) {
					removeUndefinedItems(parent as unknown[]);
				}
			}
		}

		return kept;
	}

	type DiffPathToPath = {
		path1: string;
		path2: string;
		str1?: never;
		str2?: never;
	};
	type DiffPathToStr = {
		path1: string;
		path2?: never;
		str2: string;
		str1?: never;
	};
	type DiffStrToStr = {
		path1?: never;
		path2?: never;
		str1: string;
		str2: string;
	};
	type DiffStrToPath = {
		path1?: never;
		path2: string;
		str1: string;
		str2?: never;
	};
	type DiffOptions = { quiet?: boolean; color?: boolean } & (
		| DiffPathToPath
		| DiffPathToStr
		| DiffStrToStr
		| DiffStrToPath
	);

	const DIFF_COLORS: Record<string, (line: string) => string> = {
		"+": chalk.green,
		"-": chalk.red,
		"@": chalk.magenta,
	};
	function diffLineColorMapper(line: string): string {
		return DIFF_COLORS[line.charAt(0)]?.(line) ?? line;
	}
	export function colorizeDiff(diff: string): string {
		return diff.split("\n").map(diffLineColorMapper).join("\n");
	}

	export async function diff({
		path1 = "",
		path2 = "",
		str1 = "",
		str2 = "",
		quiet = true,
		color = true,
	}: DiffOptions): Promise<false | $.ShellOutput> {
		assert((!path1 || !str1) && (!path2 || !str2), "path and str are mutually exclusive");

		const temporaryDirectory = !path1 || !path2 ? fs.mkdtempSync(path.join(os.tmpdir(), "dotsync-diff-")) : undefined;
		try {
			const left = path1 || path.join(temporaryDirectory ?? "", "left");
			const right = path2 || path.join(temporaryDirectory ?? "", "right");
			if (!path1) fs.writeFileSync(left, `${str1}\n`);
			if (!path2) fs.writeFileSync(right, `${str2}\n`);

			const out = await $`diff -ruN ${left} ${right}`.quiet().nothrow();
			if (out.exitCode > 1) {
				throw new Error(`diff failed with exit code ${out.exitCode}: ${out.stderr.toString().trim()}`);
			}
			if (!quiet) process.stdout.write(color ? colorizeDiff(out.text()) : out.text());
			return out.exitCode === 1 && out;
		} finally {
			if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
		}
	}

	export function isTrackedAndUnmodified(path: string): Promise<boolean> {
		const REPO_ROOT = (require("./config") as typeof import("./config")).REPO_ROOT;
		return $`git ls-files --error-unmatch ${path} &>/dev/null && git diff --exit-code --quiet ${path}`
			.cwd(REPO_ROOT)
			.quiet()
			.nothrow()
			.then(({ exitCode }) => exitCode === 0);
	}

	export function mkdirp(path: string): $.ShellPromise {
		return $`mkdir -p ${path}`;
	}

	export function rmrf(path: string): $.ShellPromise {
		return $`rm -rf ${path}`;
	}

	export function symlink(path: string, target: string, { force = true } = {}): $.ShellPromise {
		return $`ln -s${force ? "f" : ""} ${path} ${target}`;
	}

	export function unlink(path: string): $.ShellPromise {
		return $`unlink ${path}`;
	}

	export function mv(from: string, to: string): $.ShellPromise {
		return $`mv ${from} ${to}`;
	}

	export function tilde(to: string): string {
		const HOME = (require("./config") as typeof import("./config")).HOME;
		return `~/${path.relative(HOME, to).replace(/ /g, "\\ ")}`;
	}
}

export default utils;
