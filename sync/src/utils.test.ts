import { beforeEach, describe, expect, it } from "bun:test";
import utils from "./utils";

describe("keep", () => {
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

		expect(result.array).toHaveLength(3);
		expect(result.array).toEqual([null, { keep: true }, { keep: true }]);
	});
});
