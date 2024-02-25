import fs from "fs";
import path from "path";
import { Command, Option } from "@commander-js/extra-typings";
import {
	type Output,
	array,
	custom,
	enum_,
	getDefaults,
	literal,
	object,
	optional,
	parse,
	string,
	tuple,
	union,
	variant,
} from "valibot";
import utils from "./utils";

export const HOME = process.env.HOME ?? utils.panic("HOME not set");

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
	string([custom(assignMaxOtherInfoLength)]),
	tuple([string([custom(assignMaxOtherInfoLength)]), optional(SymlinkPathConfigSchema)]),
]);
export const symlinkPathConfigDefaults = getDefaults(SymlinkPathConfigSchema);
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
});
const DefaultsDomainSchema = union([
	string([custom(assignMaxOtherInfoLength)]),
	tuple([string([custom(assignMaxOtherInfoLength)]), optional(DefaultsDomainConfigSchema)]),
]);
export const defaultsDomainConfigDefaults = getDefaults(DefaultsDomainConfigSchema);
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
			name: string([custom(assignMaxGroupNameLength)]),
			items: array(ItemSchema),
		}),
	),
});

export const SYNCED_DIR_PATH = path.join(import.meta.dir, "..", "..", "synced");

export const CONFIG_FILE_PATH = path.join(import.meta.dir, "..", "..", "syncconf.toml");

export const config: Config = parse(ConfigSchema, Bun.TOML.parse(await Bun.file(CONFIG_FILE_PATH).text()));

export const groupNames = config.groups.map((group) => group.name);

export const args = new Command()
	.option("--do", "Perform the sync", false)
	.addOption(new Option("--groups <groups...>", "Groups to sync").choices(groupNames).default(groupNames))
	.addOption(new Option("--types <types...>", "Types to sync").choices(itemTypes).default(itemTypes))
	.addOption(
		new Option("--defaults-action <action>", "`defaults` action")
			.choices(defaultsActionTypes)
			.default(DefaultsActionType.Export),
	)
	.parse()
	.opts();

export type Config = Output<typeof ConfigSchema>;

export type Item = Output<typeof ItemSchema>;
export type ItemOfType<T extends ItemType> = Extract<Item, { type: T }>;

export type SymlinkPath = Output<typeof SymlinkPathSchema>;
export type SymlinkPathConfig = Output<typeof SymlinkPathConfigSchema>;

export type DefaultsDomain = Output<typeof DefaultsDomainSchema>;
export type DefaultsDomainConfig = Output<typeof DefaultsDomainConfigSchema>;
