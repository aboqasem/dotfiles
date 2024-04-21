import { beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { remove } from "@sagold/json-query";
import utils from "./utils";

type DirectoryTree = {
	[name: string]: string | DirectoryTree;
};

export function tempDirWithFiles(basename: string, files: DirectoryTree): string {
	function makeTree(base: string, tree: DirectoryTree) {
		for (const [name, contents] of Object.entries(tree)) {
			const joined = path.join(base, name);
			if (name.includes("/")) {
				const dir = path.dirname(name);
				fs.mkdirSync(path.join(base, dir), { recursive: true });
			}
			if (typeof contents === "object" && contents) {
				fs.mkdirSync(joined);
				makeTree(joined, contents);
				continue;
			}
			fs.writeFileSync(joined, contents);
		}
	}
	const base = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), `${basename}_`));
	makeTree(base, files);
	return base;
}

describe("utils", () => {
	describe("object manipulation", () => {
		let data: Record<string, unknown>;

		beforeEach(() => {
			data = {
				a: {
					id: "a",
					needle: "needle-a",
				},
				b: {
					id: "b",
					needle: "needle-b",
					d: {
						id: "d",
						needle: "needle-d",
					},
				},
				c: {
					e: {
						f: {
							id: "f",
							needle: "needle-f",
						},
					},
				},
			};
		});

		describe("keep", () => {
			it("should keep any matches", () => {
				const kept = utils.keep(data, "#/**/*/needle");

				expect(kept).toEqual({
					a: { needle: "needle-a" },
					b: { needle: "needle-b", d: { needle: "needle-d" } },
					c: { e: { f: { needle: "needle-f" } } },
				});
			});

			it("should keep any matches supporting filters", () => {
				const kept = utils.keep(data, "#/**/*?needle:{needle-.*}");

				expect(kept).toEqual({
					a: { id: "a", needle: "needle-a" },
					b: { id: "b", needle: "needle-b", d: { id: "d", needle: "needle-d" } },
					c: { e: { f: { id: "f", needle: "needle-f" } } },
				});
			});

			it("should keep array indices", () => {
				const data = { array: [1, { keep: true }, { keep: true }, 2] };
				const result = utils.keep(data, "#/array/*?keep:true");

				expect(result).toEqual({ array: [null, { keep: true }, { keep: true }] });
			});
		});

		describe("remove", () => {
			it("should remove any matches", () => {
				const removed = utils.remove(data, "#/**/*/needle");

				expect(removed).toEqual({
					a: { id: "a" },
					b: { id: "b", d: { id: "d" } },
					c: { e: { f: { id: "f" } } },
				});
			});

			it("should remove any matches supporting filters", () => {
				const removed = remove(data, "#/**/*?needle:{needle-.*}");

				expect(removed).toEqual({
					c: { e: {} },
				});
			});

			it("should remove array indices", () => {
				const data = { array: [1, { keep: true }, { keep: true }, 2] };
				const result = utils.remove(data, "#/array/*?keep:true");

				expect(result).toEqual({ array: [1, 2] });
			});
		});
	});

	describe("shell", () => {
		describe("diff", () => {
			it("should diff two files", async () => {
				const base = tempDirWithFiles("foo", {
					"a.txt": "a\n",
					"b.txt": "b\n",
				});
				const result = await utils.diff({ path1: path.join(base, "a.txt"), path2: path.join(base, "b.txt") });
				expect(result).toBeDefined();
			});

			it("should diff two directories", async () => {
				const base = tempDirWithFiles("foo", {
					a: {
						"a.txt": "a\n",
					},
					b: {
						"b.txt": "b\n",
					},
				});
				const result = await utils.diff({ path1: path.join(base, "a"), path2: path.join(base, "b") });
				expect(result).toBeDefined();
			});

			it("should diff two strings", async () => {
				const result = await utils.diff({ str1: "a", str2: "b" });
				expect(result).toBeDefined();
			});

			it("should diff a file and a string", async () => {
				const base = tempDirWithFiles("foo", {
					"a.txt": "a\n",
				});
				const result = await utils.diff({ path1: path.join(base, "a.txt"), str2: "a" });
				expect(result).toBeFalse();
			});
		});
	});
});
