import fs from "fs";
import path from "path";
import { $ } from "bun";
import chalk from "chalk";
import plist, { type PlistObject } from "plist";
import {
	DefaultsActionType,
	HOME,
	ItemType,
	SYNCED_DIR_PATH,
	SymlinkPathType,
	args,
	config,
	defaultsDomainAndConfig,
	maxLengths,
	symlinkPathAndConfig,
	symlinkPathValidateType,
} from "./config";
import utils from "./utils";

if (!args.do) {
	console.log(chalk.yellow("DRY RUN...\n"));
}

$.throws(true);

const EMPTY_OBJECT = Object.freeze({});

const bakFiles = [];

const typeDirLookup = new Map<string, boolean>();
async function createTypeDirIfNotExists(type: string): Promise<string> {
	const dirPath = path.join(SYNCED_DIR_PATH, type);
	if (!typeDirLookup.has(dirPath)) {
		if (!fs.existsSync(dirPath)) {
			console.log(chalk.gray(`Creating ${utils.tilde(dirPath)} directory...`));
			if (args.do) {
				await utils.mkdirp(dirPath);
			}
		}
		typeDirLookup.set(dirPath, true);
	}
	return dirPath;
}

for (const group of config.groups) {
	const groupName = group.name;
	const groupLog = console.log.bind(console, chalk.blue(groupName.padEnd(maxLengths.groupName)));
	if (!args.groups.includes(groupName) || args.excludeGroups.includes(groupName)) {
		groupLog(chalk.gray(`Skipping ${groupName}...`));
		continue;
	}

	for (const item of group.items) {
		const itemType = item.type;
		const itemLog = groupLog.bind(console, chalk.magenta(itemType.padEnd(maxLengths.itemType)));

		if (!args.types.includes(itemType) || args.excludeTypes.includes(itemType)) {
			itemLog(chalk.gray(`Skipping ${itemType}...`));
			continue;
		}
		const typeDir = await createTypeDirIfNotExists(itemType);

		switch (itemType) {
			case ItemType.Symlink:
				for (const pathMeta of item.paths) {
					const [itemPath, itemConfig] = symlinkPathAndConfig(pathMeta);
					const symlinkLog = itemLog.bind(console, chalk.cyan(itemPath.padEnd(maxLengths.otherInfo)), chalk.gray(">"));

					const sourcePath = path.resolve(typeDir, itemPath);
					const sourcePathStat = fs.lstatSync(sourcePath, { throwIfNoEntry: false });
					const targetPath = path.resolve(HOME, itemPath);
					const targetPathStat = fs.lstatSync(targetPath, { throwIfNoEntry: false });

					if (!sourcePathStat && !targetPathStat) {
						symlinkLog(`Does not exist. Creating an empty ${itemConfig.type} and creaing symlink...`);
						if (args.do) {
							switch (itemConfig.type) {
								case SymlinkPathType.File:
									await utils.mkdirp(path.dirname(targetPath));
									await utils.touch(targetPath);
									break;
								case SymlinkPathType.Dir:
									await utils.mkdirp(targetPath);
									break;
								default:
									throw new Error(`Unexpected SymlinkPathType: ${itemConfig.type}`);
							}
							await utils.symlink(sourcePath, targetPath);
						}
						continue;
					}
					sourcePathStat && symlinkPathValidateType(sourcePath, sourcePathStat, itemConfig.type);
					targetPathStat && symlinkPathValidateType(targetPath, targetPathStat, itemConfig.type);

					if (sourcePathStat && !targetPathStat) {
						symlinkLog(`${chalk.green("Only source exists.")} Creating symlink...`);
						if (args.do) {
							await utils.symlink(sourcePath, targetPath);
						}
						continue;
					}

					if (!sourcePathStat && targetPathStat) {
						symlinkLog(`${chalk.green("Only target exists.")} Storing and creating symlink...`);
						if (args.do) {
							await utils.mv(targetPath, sourcePath);
							await utils.symlink(sourcePath, targetPath);
						}
						continue;
					}

					// compiler not narrowing the type
					if (!sourcePathStat || !targetPathStat) utils.unreachable();

					if (targetPathStat.isSymbolicLink()) {
						const linkTarget = fs.readlinkSync(targetPath);
						if (linkTarget === sourcePath) {
							symlinkLog(chalk.green("Already symlinked."));
						} else {
							symlinkLog(`${chalk.yellow("Overriding symlink:")} '${linkTarget}'...`);
							if (args.do) {
								await utils.unlink(targetPath);
								await utils.symlink(sourcePath, targetPath);
							}
						}
						continue;
					}

					const hasDiff = await $`diff -ruN ${sourcePath} ${targetPath}`
						.quiet()
						.nothrow()
						.then(({ exitCode }) => exitCode !== 0);
					const bakFile = `${sourcePath}.${Date.now()}.bak`;
					if (hasDiff) {
						symlinkLog(
							`${chalk.yellow("Diff found.")} Backing up source, replacing it with target, and creating symlink.`,
						);
						bakFiles.push(utils.tilde(bakFile));
					} else {
						symlinkLog(`${chalk.green("No diff.")} Replacing with symlink...`);
					}
					if (args.do) {
						if (hasDiff) {
							await utils.mv(sourcePath, `${sourcePath}.bak`);
							await utils.mv(targetPath, sourcePath);
						}
						await utils.symlink(sourcePath, targetPath);
					}
				}
				break;

			case ItemType.Defaults:
				for (const domainMeta of item.domains) {
					const [itemDomain, itemConfig] = defaultsDomainAndConfig(domainMeta);
					const defaultsLog = itemLog.bind(
						console,
						chalk.cyan(itemDomain.padEnd(maxLengths.otherInfo)),
						chalk.gray(">"),
					);

					const sourcePath = path.resolve(typeDir, `${itemDomain}.plist`);
					const sourcePathStat = fs.lstatSync(sourcePath, { throwIfNoEntry: false });

					switch (args.defaultsAction) {
						case DefaultsActionType.Export: {
							if (!sourcePathStat) {
								defaultsLog(`${chalk.green("Does not exist.")} Exporting defaults...`);
							}
							const exported = await $`defaults export ${itemDomain} -`.text();
							let plistObject = plist.parse(exported);

							if (Bun.deepEquals(plistObject, EMPTY_OBJECT)) {
								defaultsLog(chalk.green("Nothing to export."));
								break;
							}

							utils.assert(
								typeof plistObject === "object" &&
									!Array.isArray(plistObject) &&
									!(plistObject instanceof Date) &&
									!(plistObject instanceof Buffer),
								`Unexpected plist type: ${typeof plistObject}`,
							);

							if (itemConfig.include) {
								plistObject = utils.keep(plistObject, itemConfig.include) as PlistObject;
							}

							const final = plist.build(plistObject, { pretty: true, indent: "\t" });

							if (sourcePathStat) {
								const existing = await Bun.file(sourcePath).text();
								if (existing === final) {
									defaultsLog(chalk.green("No change."));
									break;
								}

								defaultsLog(`${chalk.yellow("Diff found.")} Backing up existing and saving new...`);
								const bakFile = `${sourcePath}.${Date.now()}.bak`;
								bakFiles.push(utils.tilde(bakFile));
								if (args.do) {
									await utils.mv(sourcePath, bakFile);
								}
							}

							if (args.do) {
								await Bun.write(sourcePath, final);
							}

							break;
						}

						case DefaultsActionType.Import: {
							if (!sourcePathStat) {
								defaultsLog(`${chalk.yellow("Does not exist.")} Skipping...`);
								break;
							}

							defaultsLog(`${chalk.green("Found.")} Importing defaults...`);
							if (args.do) {
								await $`defaults import ${itemDomain} ${sourcePath}`;
							}

							break;
						}

						default:
							throw new Error(`Unexpected DefaultsActionType: ${args.defaultsAction}`);
					}
				}
				break;

			default:
				throw new Error(`Unexpected ItemType: ${itemType}`);
		}
	}
}

if (bakFiles.length) {
	console.log(chalk.yellow("\nBacked up files:"), bakFiles.join(" "));
	console.log(chalk.yellow("Review and commit."));
}

if (!args.do) {
	console.log(chalk.yellow("\nUse --do to apply changes."));
}
