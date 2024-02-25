import "@total-typescript/ts-reset";

declare global {
	interface ArrayConstructor {
		// biome-ignore lint/suspicious/noExplicitAny: this is a type guard
		isArray(arg: any): arg is arg extends readonly any[] ? readonly unknown[] : unknown[];
	}
}
