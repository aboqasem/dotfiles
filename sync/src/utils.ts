import path from "node:path";
import { remove as removePointer, removeUndefinedItems } from "@sagold/json-pointer";
import { get, set } from "@sagold/json-query";
import { $, type ShellOutput, type ShellPromise } from "bun";
import { HOME, REPO_ROOT } from "./config";

namespace utils {
	export function panic(message: string): never {
		throw new Error(message);
	}

	export function unreachable(): never {
		throw new Error("Unreachable");
	}

	export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
		if (!condition) {
			throw new Error(message);
		}
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
	const VALUE_INDEX = 0;
	const KEY_INDEX = 1;
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
	type DiffOptions = { quiet?: boolean } & (DiffPathToPath | DiffPathToStr | DiffStrToStr | DiffStrToPath);

	export function diff({
		path1 = "",
		path2 = "",
		str1 = "",
		str2 = "",
		quiet = true,
	}: DiffOptions): Promise<false | ShellOutput> {
		assert((!path1 || !str1) && (!path2 || !str2), "path and str are mutually exclusive");

		const sub1 = { raw: path1 ? "$" : "<" };
		const sub2 = { raw: path2 ? "$" : "<" };
		return $`bash -c "diff -ruN ${sub1}(echo '${path1 || str1}') ${sub2}(echo '${path2 || str2}')"`
			.quiet()
			.nothrow()
			.then((out) => {
				if (!quiet) process.stdout.write(out.text());
				const hasDiff = out.exitCode !== 0;
				return hasDiff && out;
			});
	}

	export function isTrackedAndUnmodified(path: string): Promise<boolean> {
		return $`git ls-files --error-unmatch ${path} &>/dev/null && git diff --exit-code --quiet ${path}`
			.cwd(REPO_ROOT)
			.quiet()
			.nothrow()
			.then(({ exitCode }) => exitCode === 0);
	}

	export function mkdirp(path: string): ShellPromise {
		return $`mkdir -p ${path}`;
	}

	export function rmrf(path: string): ShellPromise {
		return $`rm -rf ${path}`;
	}

	export function symlink(path: string, target: string, { force = true } = {}): ShellPromise {
		return $`ln -s${force ? "f" : ""} ${path} ${target}`;
	}

	export function unlink(path: string): ShellPromise {
		return $`unlink ${path}`;
	}

	export function mv(from: string, to: string): ShellPromise {
		return $`mv ${from} ${to}`;
	}

	export function tilde(to: string): string {
		return `~/${path.relative(HOME, to).replace(/ /g, "\\ ")}`;
	}
}

export default utils;
