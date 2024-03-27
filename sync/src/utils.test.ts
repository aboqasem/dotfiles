import { beforeEach, describe, expect, it } from "bun:test";
import { remove } from "@sagold/json-query";
import utils from "./utils";

describe("utils", () => {
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
