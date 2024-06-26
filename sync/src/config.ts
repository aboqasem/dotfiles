import fs from "node:fs";
import path from "node:path";
import { Command, Option } from "@commander-js/extra-typings";
import { $ } from "bun";
import {
	type InferOutput,
	array,
	check,
	enum_,
	getDefaults,
	literal,
	object,
	optional,
	parse,
	pipe,
	string,
	tuple,
	union,
	variant,
} from "valibot";
import utils from "./utils";

export const HOME = process.env.HOME ?? utils.panic("HOME not set");
export const REPO_ROOT = (await $`git rev-parse --show-toplevel`.cwd(import.meta.dir).text()).trimEnd();

export const maxLengths = {
	groupName: -1,
	itemType: -1,
	otherInfo: -1,
};

function assignMaxLength(key: keyof typeof maxLengths): (value: string) => true {
	return (value) => {
		maxLengths[key] = Math.max(maxLengths[key], value.length) + 1;
		return true;
	};
}
const assignMaxGroupNameLength = assignMaxLength("groupName");
const assignMaxItemTypeNameLength = assignMaxLength("itemType");
const assignMaxOtherInfoLength = assignMaxLength("otherInfo");

export enum ItemType {
	Symlink = "symlink",
	Defaults = "defaults",
}
export const itemTypes = Object.values(ItemType).filter(assignMaxItemTypeNameLength);

export enum SymlinkPathType {
	File = "file",
	Dir = "dir",
}

export enum DefaultsActionType {
	Export = "export",
	Import = "import",
}
export const defaultsActionTypes = Object.values(DefaultsActionType);

const SymlinkPathConfigSchema = object({
	type: optional(enum_(SymlinkPathType), SymlinkPathType.File),
});
const SymlinkPathSchema = union([
	pipe(string(), check(assignMaxOtherInfoLength)),
	tuple([pipe(string(), check(assignMaxOtherInfoLength)), optional(SymlinkPathConfigSchema)]),
]);
export const symlinkPathConfigDefaults = getDefaults(SymlinkPathConfigSchema) ?? utils.panic("SymlinkPathConfigSchema");
export function symlinkPathAndConfig(meta: SymlinkPath): [string, SymlinkPathConfig] {
	return typeof meta === "string" ? [meta, symlinkPathConfigDefaults] : [meta[0], meta[1] ?? symlinkPathConfigDefaults];
}
export function symlinkPathValidateType(path: string, stat: fs.Stats, type: SymlinkPathType): void {
	if (stat.isSymbolicLink()) {
		stat = fs.statSync(path);
	}
	if ((stat.isFile() && type === SymlinkPathType.File) || (stat.isDirectory() && type === SymlinkPathType.Dir)) {
		return;
	}

	throw new Error(`Expected ${type} at '${path}'`);
}

const DefaultsDomainConfigSchema = object({
	include: optional(array(string())),
	exclude: optional(array(string())),
});
const DefaultsDomainSchema = union([
	pipe(string(), check(assignMaxOtherInfoLength)),
	tuple([pipe(string(), check(assignMaxOtherInfoLength)), optional(DefaultsDomainConfigSchema)]),
]);
export const defaultsDomainConfigDefaults =
	getDefaults(DefaultsDomainConfigSchema) ?? utils.panic("DefaultsDomainConfigSchema");
export function defaultsDomainAndConfig(meta: DefaultsDomain): [string, DefaultsDomainConfig] {
	return typeof meta === "string"
		? [meta, defaultsDomainConfigDefaults]
		: [meta[0], meta[1] ?? defaultsDomainConfigDefaults];
}

const ItemSchema = variant("type", [
	object({
		type: literal(ItemType.Symlink),
		paths: array(SymlinkPathSchema),
	}),
	object({
		type: literal(ItemType.Defaults),
		domains: array(DefaultsDomainSchema),
	}),
]);

const ConfigSchema = object({
	groups: array(
		object({
			name: pipe(string(), check(assignMaxGroupNameLength)),
			items: array(ItemSchema),
		}),
	),
});

export const SYNCED_DIR_PATH = path.join(REPO_ROOT, "synced");

export const CONFIG_FILE_PATH = path.join(REPO_ROOT, "syncconf.toml");

export const config: Config = parse(ConfigSchema, Bun.TOML.parse(await Bun.file(CONFIG_FILE_PATH).text()));

export const groupNames = config.groups.map((group) => group.name);

export const args = new Command()
	.option("--do", "Perform the sync", false)
	.option("--no-diff", "Do not show diff")
	.addOption(new Option("--groups <groups...>", "Groups to sync").choices(groupNames).default(groupNames))
	.addOption(
		new Option("--exclude-groups <groups...>", "Groups to not sync").choices(groupNames).default([] as string[]),
	)
	.addOption(new Option("--types <types...>", "Types to sync").choices(itemTypes).default(itemTypes))
	.addOption(new Option("--exclude-types <types...>", "Types to not sync").choices(itemTypes).default([] as ItemType[]))
	.addOption(
		new Option("--defaults-action <action>", "`defaults` action")
			.choices(defaultsActionTypes)
			.default(DefaultsActionType.Export),
	)
	.parse()
	.opts();

export type Config = InferOutput<typeof ConfigSchema>;

export type Item = InferOutput<typeof ItemSchema>;
export type ItemOfType<T extends ItemType> = Extract<Item, { type: T }>;

export type SymlinkPath = InferOutput<typeof SymlinkPathSchema>;
export type SymlinkPathConfig = InferOutput<typeof SymlinkPathConfigSchema>;

export type DefaultsDomain = InferOutput<typeof DefaultsDomainSchema>;
export type DefaultsDomainConfig = InferOutput<typeof DefaultsDomainConfigSchema>;
