import path from "path";
import { $, type ShellPromise } from "bun";
import { HOME } from "./config";

namespace utils {
	export function panic(message: string): never {
		throw new Error(message);
	}

	export function unreachable(): never {
		throw new Error("Unreachable");
	}

	export function mkdirp(path: string): ShellPromise {
		return $`mkdir -p ${path}`;
	}

	export function touch(path: string): ShellPromise {
		return $`touch ${path}`;
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
		return `~/${path.relative(HOME, to)}`;
	}
}

export default utils;
