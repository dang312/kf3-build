#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
	createGameInventory,
	DEFAULT_WINDOWS_ROOT,
	DEFAULT_WSL_ROOT,
	exists,
	listFilesRecursive,
	toKebabCase,
	toPortableRelativePath
} from './lib/game-inventory.mjs';

const DEFAULT_OUT_DIR = 'scratch/skill-collection';
const DEFAULT_FMODEL_EXPORT_ROOT = 'scratch/fmodel-export';
const DEFAULT_LOCRES_GAME_CSV = 'scratch/locres-game-en/Game.csv';
const DEFAULT_RAW_EXTRACT_ROOT = 'scratch/raw-extract';
const DEFAULT_LEVEL_REQUIREMENTS_PATH = 'webapp/data/skill/level_requirement.json';
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MATCHES_PER_SKILL = 5;
const TEXT_EXPORT_EXTENSIONS = new Set([
	'.json',
	'.txt',
	'.csv',
	'.tsv',
	'.ini',
	'.cfg',
	'.po',
	'.pot',
	'.yaml',
	'.yml',
	'.xml'
]);
const SKILL_CATEGORIES = ['passives', 'throwable', 'gadget'];
const CATEGORY_ORDER = new Map(SKILL_CATEGORIES.map((category, index) => [category, index]));
const CATEGORY_UNLOCK_TOKEN = {
	passives: 'PASSIVES',
	throwable: 'THROWABLE',
	gadget: 'GADGET'
};
const LOCRES_CATEGORY_TO_SKILL_CATEGORY = new Map([
	['Passive', 'passives'],
	['Throwable', 'throwable'],
	['Gadget', 'gadget']
]);
const RAW_TREE_KIND_TO_SKILL_CATEGORY = new Map([
	['Passive', 'passives'],
	['Grenade', 'throwable'],
	['Gadget', 'gadget']
]);
const SPECIALIST_TO_PERK = new Map([
	['Devlin', 'firebug'],
	['Foster', 'commando'],
	['Imran', 'engineer'],
	['Luna', 'sharpshooter'],
	['Nakata', 'ninja'],
	['Obi', 'medic']
]);
const RAW_SPECIALIST_FOLDER_TO_PERK = new Map([
	['Commando', 'commando'],
	['Engineer', 'engineer'],
	['Firebug', 'firebug'],
	['Medic', 'medic'],
	['Ninja', 'ninja'],
	['Sharpshooter', 'sharpshooter']
]);

function parseArgs(argv) {
	const args = {
		gameRoot: process.env.KF3_GAME_ROOT ?? DEFAULT_WINDOWS_ROOT,
		fmodelExportRoot: DEFAULT_FMODEL_EXPORT_ROOT,
		locresGameCsv: DEFAULT_LOCRES_GAME_CSV,
		rawExtractRoot: DEFAULT_RAW_EXTRACT_ROOT,
		levelRequirementsPath: DEFAULT_LEVEL_REQUIREMENTS_PATH,
		outDir: DEFAULT_OUT_DIR,
		maxFileBytes: DEFAULT_MAX_FILE_BYTES,
		matchesPerSkill: DEFAULT_MATCHES_PER_SKILL
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--game-root') {
			args.gameRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--fmodel-export-root') {
			args.fmodelExportRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--locres-game-csv') {
			args.locresGameCsv = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--raw-extract-root') {
			args.rawExtractRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--level-requirements') {
			args.levelRequirementsPath = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--out-dir') {
			args.outDir = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--max-file-bytes') {
			args.maxFileBytes = parsePositiveInteger(requiredValue(argv, index, arg), arg);
			index += 1;
		} else if (arg === '--matches-per-skill') {
			args.matchesPerSkill = parsePositiveInteger(requiredValue(argv, index, arg), arg);
			index += 1;
		} else if (arg === '--no-fmodel') {
			args.fmodelExportRoot = undefined;
		} else if (arg === '--no-locres') {
			args.locresGameCsv = undefined;
		} else if (arg === '--no-raw-extract') {
			args.rawExtractRoot = undefined;
		} else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return args;
}

function requiredValue(argv, index, arg) {
	const value = argv[index + 1];
	if (!value || value.startsWith('--')) {
		throw new Error(`${arg} requires a value`);
	}
	return value;
}

function parsePositiveInteger(value, arg) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${arg} must be a positive integer`);
	}
	return parsed;
}

function printHelp() {
	console.log(`Usage: node tools/kf3-data/collect-skill-candidates.mjs [options]\n\nCollects reviewable skill candidates from local skill-preview files, optional English Game.locres CSV output, optional raw extracted skill-tree .uasset files, and optional FModel text/JSON exports. It does not extract PAK/IoStore archives itself.\n\nOptions:\n  --game-root PATH            KF3/Nightfall install root. Defaults to KF3_GAME_ROOT or ${DEFAULT_WINDOWS_ROOT}\n  --locres-game-csv PATH      English Game.locres CSV from UEExtractor. Defaults to ${DEFAULT_LOCRES_GAME_CSV}\n  --no-locres                 Skip Game.locres skill name/description enrichment.\n  --raw-extract-root PATH     Raw extracted .uasset root. Defaults to ${DEFAULT_RAW_EXTRACT_ROOT}\n  --no-raw-extract            Skip raw skill-tree tier enrichment.\n  --level-requirements PATH   Category unlock levels JSON. Defaults to ${DEFAULT_LEVEL_REQUIREMENTS_PATH}\n  --fmodel-export-root PATH   Optional FModel export root. Defaults to ${DEFAULT_FMODEL_EXPORT_ROOT}\n  --no-fmodel                 Skip FModel export scanning.\n  --out-dir PATH              Output directory. Defaults to ${DEFAULT_OUT_DIR}\n  --max-file-bytes N          Max exported text file size to scan. Defaults to ${DEFAULT_MAX_FILE_BYTES}\n  --matches-per-skill N       Max FModel matches recorded per skill. Defaults to ${DEFAULT_MATCHES_PER_SKILL}\n\nExamples:\n  node tools/kf3-data/collect-skill-candidates.mjs --game-root "${DEFAULT_WSL_ROOT}"\n  node tools/kf3-data/collect-skill-candidates.mjs --game-root "${DEFAULT_WINDOWS_ROOT}" --out-dir scratch/skill-collection`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const collection = await collectSkillCandidates(args);
	await writeCollection(args.outDir, collection);
	printSummary(args.outDir, collection);
}

async function collectSkillCandidates(args) {
	const inventory = await createGameInventory(args.gameRoot);
	const warnings = [];
	const candidateMap = createCandidateMap(inventory.skillPreviews);
	const levelRequirements = await loadLevelRequirements(args.levelRequirementsPath, warnings);
	const locresScan = await maybeLoadLocres(args.locresGameCsv, candidateMap, warnings);
	const rawTreeScan = await maybeLoadRawSkillTrees(
		args.rawExtractRoot,
		candidateMap,
		levelRequirements,
		args.levelRequirementsPath,
		warnings
	);

	let candidates = [...candidateMap.values()].sort(compareSkillCandidates);
	let fmodelScan = {
		enabled: false,
		exportRoot: args.fmodelExportRoot,
		filesScanned: 0,
		filesSkipped: 0,
		matchesRecorded: 0,
		warnings: []
	};

	if (args.fmodelExportRoot) {
		if (await exists(args.fmodelExportRoot)) {
			fmodelScan = await scanFmodelExports(args.fmodelExportRoot, candidates, {
				maxFileBytes: args.maxFileBytes,
				matchesPerSkill: args.matchesPerSkill
			});
		} else {
			warnings.push(
				`FModel export root not found: ${args.fmodelExportRoot}. Skipping FModel text/JSON match scanning.`
			);
		}
	}

	for (const warning of fmodelScan.warnings) {
		warnings.push(warning);
	}

	for (const candidate of candidateMap.values()) {
		refreshCollectionStatus(candidate);
	}

	candidates = [...candidateMap.values()].sort(compareSkillCandidates);
	const perks = groupCandidatesByPerk(candidates);
	return {
		generatedAt: new Date().toISOString(),
		inputs: {
			gameRoot: inventory.gameRoot,
			locresGameCsv: locresScan.enabled ? locresScan.path : undefined,
			rawExtractRoot: rawTreeScan.enabled ? rawTreeScan.root : undefined,
			levelRequirementsPath: levelRequirements ? args.levelRequirementsPath : undefined,
			fmodelExportRoot: fmodelScan.enabled ? fmodelScan.exportRoot : undefined
		},
		summary: {
			packageCount: inventory.summary.packageCount,
			skillPreviewCount: inventory.summary.skillPreviewCount,
			previewCandidateSkillCount: inventory.summary.uniqueCandidateSkillSlugCount,
			candidateSkillCount: candidates.length,
			candidateSkillsWithDescriptions: candidates.filter((candidate) => candidate.description).length,
			candidateSkillsWithTier: candidates.filter((candidate) => candidate.tierNumber).length,
			candidateSkillsWithUnlockLevel: candidates.filter((candidate) => candidate.unlockLevel).length,
			locresSkillRecords: locresScan.skillRecords,
			rawSkillTreeAssets: rawTreeScan.assetCount,
			rawSkillTreeSkillReferences: rawTreeScan.skillReferences,
			duplicateCandidateSkillSlugs: inventory.summary.duplicateCandidateSkillSlugs,
			perkCount: perks.length,
			perkSkillCounts: Object.fromEntries(
				perks.map((perk) => [perk.perkSlug, perk.skills.length])
			),
			fmodelFilesScanned: fmodelScan.filesScanned,
			fmodelFilesSkipped: fmodelScan.filesSkipped,
			fmodelMatchesRecorded: fmodelScan.matchesRecorded
		},
		levelRequirements,
		warnings,
		packages: inventory.packages,
		perks
	};
}

async function loadLevelRequirements(levelRequirementsPath, warnings) {
	if (!levelRequirementsPath) {
		return undefined;
	}

	if (!(await exists(levelRequirementsPath))) {
		warnings.push(`Level requirements file not found: ${levelRequirementsPath}. Unlock levels omitted.`);
		return undefined;
	}

	const parsed = JSON.parse(await readFile(levelRequirementsPath, 'utf8'));
	const normalized = {};
	for (const category of SKILL_CATEGORIES) {
		const values = parsed[category];
		if (!Array.isArray(values)) {
			warnings.push(`Level requirements missing category: ${category}`);
			continue;
		}
		normalized[category] = values.map((value) => Number(value));
	}
	return normalized;
}

function createCandidateMap(skillPreviews) {
	const candidateMap = new Map();

	for (const preview of skillPreviews) {
		const candidate = getOrCreateCandidate(candidateMap, {
			perkSlug: preview.perkSlug,
			candidateSkillSlug: preview.candidateSkillSlug,
			candidateSkillName: preview.candidateSkillName
		});

		candidate.previewFiles.push({
			fileName: preview.fileName,
			folder: preview.folder,
			relativePath: preview.relativePath
		});
		candidate.notes.add(
			'Candidate discovered from local skill preview filename. Preview files do not prove category, tier, effect text, values, or unlock level by themselves.'
		);
	}

	return candidateMap;
}

function getOrCreateCandidate(candidateMap, { perkSlug, candidateSkillSlug, candidateSkillName }) {
	const existing =
		candidateMap.get(candidateSkillSlug) ??
		findCandidateByComparableName(candidateMap, perkSlug, candidateSkillName);
	if (existing) {
		if (candidateSkillSlug && existing.candidateSkillSlug !== candidateSkillSlug) {
			existing.alternateSkillSlugs.add(candidateSkillSlug);
		}
		if (candidateSkillName && existing.candidateSkillName !== candidateSkillName) {
			existing.alternateNames.add(candidateSkillName);
		}
		return existing;
	}

	const candidate = {
		perkSlug,
		candidateSkillSlug,
		candidateSkillName,
		alternateNames: new Set(),
		alternateSkillSlugs: new Set(),
		collectionStatus: 'candidate-only',
		previewFiles: [],
		fmodelMatches: [],
		gameSources: {},
		notes: new Set()
	};
	candidateMap.set(candidateSkillSlug, candidate);
	return candidate;
}

function findCandidateByComparableName(candidateMap, perkSlug, candidateSkillName) {
	if (!candidateSkillName) {
		return undefined;
	}

	const comparableName = toComparableSkillName(candidateSkillName);
	for (const candidate of candidateMap.values()) {
		if (candidate.perkSlug !== perkSlug) {
			continue;
		}
		const comparableNames = [candidate.candidateSkillName, ...candidate.alternateNames]
			.filter(Boolean)
			.map(toComparableSkillName);
		if (comparableNames.includes(comparableName)) {
			return candidate;
		}
	}
	return undefined;
}

function toComparableSkillName(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function maybeLoadLocres(locresGameCsv, candidateMap, warnings) {
	const scan = {
		enabled: false,
		path: locresGameCsv,
		skillRecords: 0
	};

	if (!locresGameCsv) {
		return scan;
	}

	if (!(await exists(locresGameCsv))) {
		warnings.push(
			`English Game.locres CSV not found: ${locresGameCsv}. Skill descriptions will be omitted unless found through other sources.`
		);
		return scan;
	}

	const { records, warnings: locresWarnings } = parseSkillLocresCsv(
		await readFile(locresGameCsv, 'utf8')
	);
	for (const warning of locresWarnings) {
		warnings.push(warning);
	}

	for (const record of records) {
		const candidateSkillSlug = `${record.perkSlug}-${toKebabCase(record.name)}`;
		const candidate = getOrCreateCandidate(candidateMap, {
			perkSlug: record.perkSlug,
			candidateSkillSlug,
			candidateSkillName: record.name
		});
		candidate.candidateSkillName = record.name;
		candidate.category ??= record.category;
		candidate.skillNumber ??= record.skillNumber;
		candidate.description = record.description;
		candidate.gameSources.locresNameKey = record.nameKey;
		candidate.gameSources.locresDescriptionKey = record.descriptionKey;
		candidate.notes.add('Name and detailed effect text recovered from English Game.locres.');
	}

	scan.enabled = true;
	scan.skillRecords = records.length;
	return scan;
}

function parseSkillLocresCsv(text) {
	const rows = parseCsvRecords(text);
	const entries = new Map();
	const warnings = [];
	const keyPattern = /^[^:]+::(Passive|Throwable|Gadget)(\d+)_Skill(Name|Description)_([A-Za-z]+)$/;

	for (const row of rows) {
		if (row.length < 2) {
			continue;
		}

		const key = row[0];
		const value = row[1] ?? '';
		const match = keyPattern.exec(key);
		if (!match) {
			continue;
		}

		const [, locresCategory, skillNumberText, field, specialist] = match;
		const perkSlug = SPECIALIST_TO_PERK.get(specialist);
		const category = LOCRES_CATEGORY_TO_SKILL_CATEGORY.get(locresCategory);
		if (!perkSlug || !category) {
			warnings.push(`Skipped locres skill row with unknown specialist/category: ${key}`);
			continue;
		}

		const skillNumber = Number.parseInt(skillNumberText, 10);
		const entryKey = `${perkSlug}|${category}|${skillNumber}`;
		const entry = entries.get(entryKey) ?? {
			perkSlug,
			category,
			skillNumber
		};

		if (field === 'Name') {
			entry.name = value;
			entry.nameKey = key;
		} else {
			entry.description = value;
			entry.descriptionKey = key;
		}
		entries.set(entryKey, entry);
	}

	const records = [];
	for (const entry of entries.values()) {
		if (!entry.name || !entry.description) {
			warnings.push(
				`Incomplete locres skill entry for ${entry.perkSlug} ${entry.category} ${entry.skillNumber}.`
			);
			continue;
		}
		records.push(entry);
	}

	return {
		records: records.sort(compareLocresRecords),
		warnings
	};
}

function parseCsvRecords(text) {
	const records = [];
	let row = [];
	let field = '';
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (inQuotes) {
			if (char === '"') {
				if (text[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === ',') {
			row.push(field);
			field = '';
		} else if (char === '\n') {
			row.push(field);
			records.push(row);
			row = [];
			field = '';
		} else if (char !== '\r') {
			field += char;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		records.push(row);
	}

	return records;
}

function compareLocresRecords(left, right) {
	return (
		left.perkSlug.localeCompare(right.perkSlug) ||
		categorySort(left.category, right.category) ||
		left.skillNumber - right.skillNumber
	);
}

async function maybeLoadRawSkillTrees(
	rawExtractRoot,
	candidateMap,
	levelRequirements,
	levelRequirementsPath,
	warnings
) {
	const scan = {
		enabled: false,
		root: rawExtractRoot,
		assetCount: 0,
		skillReferences: 0
	};

	if (!rawExtractRoot) {
		return scan;
	}

	if (!(await exists(rawExtractRoot))) {
		warnings.push(
			`Raw extract root not found: ${rawExtractRoot}. Skill tier grouping will be omitted unless found through other sources.`
		);
		return scan;
	}

	const files = await listFilesRecursive(rawExtractRoot, (filePath) =>
		/SPEC_.+_(Passive|Grenade|Gadget)SkillTree\.uasset$/i.test(path.basename(filePath))
	);

	for (const filePath of files) {
		const relativePath = toPortableRelativePath(rawExtractRoot, filePath);
		const parsed = parseRawSkillTreeAsset(await readFile(filePath), relativePath);
		if (!parsed) {
			warnings.push(`Could not parse skill tree asset: ${relativePath}`);
			continue;
		}

		scan.assetCount += 1;
		let localizedSkillNumber = 0;
		for (const tier of parsed.tiers) {
			const unlockLevel = levelRequirements?.[parsed.category]?.[tier.tierNumber - 1];
			for (const [optionIndex, internalName] of tier.internalNames.entries()) {
				const candidateSkillSlug = `${parsed.perkSlug}-${toKebabCase(internalName)}`;
				const skillNumber = isCapacityTierInternalName(internalName)
					? undefined
					: (localizedSkillNumber += 1);
				const candidate =
					(skillNumber
						? findCandidateBySkillRecord(candidateMap, parsed.perkSlug, parsed.category, skillNumber)
						: undefined) ??
					getOrCreateCandidate(candidateMap, {
						perkSlug: parsed.perkSlug,
						candidateSkillSlug,
						candidateSkillName: pascalToWords(internalName)
					});
				if (candidate.candidateSkillSlug !== candidateSkillSlug) {
					candidate.alternateSkillSlugs.add(candidateSkillSlug);
				}
				candidate.internalName = internalName;
				candidate.category = parsed.category;
				candidate.skillNumber ??= skillNumber;
				candidate.tierNumber = tier.tierNumber;
				candidate.treeOrder = optionIndex;
				if (unlockLevel !== undefined) {
					candidate.unlockLevel = unlockLevel;
					candidate.gameSources.levelRequirementSource = levelRequirementsPath;
				}
				candidate.gameSources.rawSkillTreeAsset = relativePath;
				candidate.notes.add('Category and one-based tier position recovered from raw skill tree asset.');
				scan.skillReferences += 1;
			}
		}
	}

	if (scan.assetCount > 0 && !levelRequirements) {
		warnings.push('Raw skill trees were parsed, but no level requirement table was available.');
	}

	scan.enabled = scan.assetCount > 0;
	return scan;
}

function parseRawSkillTreeAsset(bytes, relativePath) {
	const fileName = path.basename(relativePath);
	const fileMatch = /^SPEC_.+_(Passive|Grenade|Gadget)SkillTree\.uasset$/i.exec(fileName);
	const folderMatch = /Specialists\/([^/]+)\/Skills\//.exec(relativePath);
	if (!fileMatch || !folderMatch) {
		return undefined;
	}

	const perkSlug = RAW_SPECIALIST_FOLDER_TO_PERK.get(folderMatch[1]);
	const category = RAW_TREE_KIND_TO_SKILL_CATEGORY.get(fileMatch[1]);
	if (!perkSlug || !category) {
		return undefined;
	}

	const names = parseUassetNameMap(bytes, fileName.replace(/\.uasset$/i, ''));
	if (names.length === 0) {
		return undefined;
	}

	const categoryToken = CATEGORY_UNLOCK_TOKEN[category];
	const categoryIndex = bytes.indexOf(Buffer.from(categoryToken, 'ascii'));
	if (categoryIndex === -1) {
		return undefined;
	}

	const tierCountIndex = findUInt32LE(bytes, 5, categoryIndex + categoryToken.length, 80);
	if (tierCountIndex === -1) {
		return undefined;
	}

	let offset = tierCountIndex + 4;
	const tiers = [];
	for (let tierNumber = 1; tierNumber <= 5; tierNumber += 1) {
		const tierHeaderIndex = findTierHeader(bytes, offset, 24);
		if (tierHeaderIndex === -1) {
			return undefined;
		}

		const skillCount = bytes[tierHeaderIndex + 2];
		offset = tierHeaderIndex + 7;
		const internalNames = [];
		for (let skillIndex = 0; skillIndex < skillCount; skillIndex += 1) {
			const itemIndex = findNameReferenceMarker(bytes, offset, 12);
			if (itemIndex === -1 || itemIndex + 9 > bytes.length) {
				return undefined;
			}
			const nameIndex = bytes.readUInt32LE(itemIndex + 5);
			const internalName = names[nameIndex];
			if (!internalName) {
				return undefined;
			}
			internalNames.push(internalName);
			offset = itemIndex + 9;
		}
		tiers.push({ tierNumber, internalNames });
	}

	return {
		perkSlug,
		category,
		relativePath,
		tiers
	};
}

function parseUassetNameMap(bytes, expectedAssetName) {
	if (bytes.length < 16) {
		return [];
	}

	const nameCount = bytes.readUInt32LE(8);
	if (nameCount <= 0 || nameCount > 2000) {
		return [];
	}

	let best;
	const searchLimit = Math.min(bytes.length - nameCount * 2 - 2, 16 * 1024);
	for (let offset = 0; offset < searchLimit; offset += 1) {
		const lengths = [];
		let ok = true;
		for (let index = 0; index < nameCount; index += 1) {
			const length = bytes.readUInt16BE(offset + index * 2);
			if (length < 1 || length > 240) {
				ok = false;
				break;
			}
			lengths.push(length);
		}
		if (!ok) {
			continue;
		}

		for (const skip of [0, 2, 4]) {
			let position = offset + nameCount * 2 + skip;
			const names = [];
			let namesOk = true;
			for (const length of lengths) {
				const end = position + length;
				if (end > bytes.length) {
					namesOk = false;
					break;
				}

				const slice = bytes.subarray(position, end);
				if (![...slice].every(isPrintableAscii)) {
					namesOk = false;
					break;
				}

				names.push(slice.toString('ascii'));
				position = end;
			}
			if (!namesOk) {
				continue;
			}

			const score = scoreNameMap(names, expectedAssetName);
			if (!best || score > best.score) {
				best = { score, names };
			}
		}
	}

	return best?.names ?? [];
}

function scoreNameMap(names, expectedAssetName) {
	let score = 0;
	for (const name of names) {
		if (/^[A-Za-z0-9_!.\-/]+$/.test(name)) {
			score += 1;
		}
		if (
			name.includes('Passive') ||
			name.includes('Gadget') ||
			name.includes('Throwable') ||
			name.includes('Skill') ||
			name.includes('Player.')
		) {
			score += 2;
		}
	}
	if (expectedAssetName && names.includes(expectedAssetName)) {
		score += 100;
	}
	return score;
}

function isPrintableAscii(value) {
	return value >= 32 && value <= 126;
}

function findUInt32LE(bytes, value, start, maxDistance) {
	const end = Math.min(bytes.length - 4, start + maxDistance);
	for (let index = start; index <= end; index += 1) {
		if (bytes.readUInt32LE(index) === value) {
			return index;
		}
	}
	return -1;
}

function findTierHeader(bytes, start, maxDistance) {
	const end = Math.min(bytes.length - 7, start + maxDistance);
	for (let index = start; index <= end; index += 1) {
		if (
			bytes[index] === 0x00 &&
			bytes[index + 1] === 0x03 &&
			bytes[index + 2] > 0 &&
			bytes[index + 2] < 10 &&
			bytes[index + 3] === 0x00 &&
			bytes[index + 4] === 0x00 &&
			bytes[index + 5] === 0x00 &&
			bytes[index + 6] === 0x00
		) {
			return index;
		}
	}
	return -1;
}

function findNameReferenceMarker(bytes, start, maxDistance) {
	const end = Math.min(bytes.length - 9, start + maxDistance);
	for (let index = start; index <= end; index += 1) {
		if (
			bytes[index] === 0x05 &&
			bytes[index + 1] === 0xfe &&
			bytes[index + 2] === 0xff &&
			bytes[index + 3] === 0xff &&
			bytes[index + 4] === 0xff
		) {
			return index;
		}
	}
	return -1;
}

function findCandidateBySkillRecord(candidateMap, perkSlug, category, skillNumber) {
	for (const candidate of candidateMap.values()) {
		if (
			candidate.perkSlug === perkSlug &&
			candidate.category === category &&
			candidate.skillNumber === skillNumber
		) {
			return candidate;
		}
	}
	return undefined;
}

function isCapacityTierInternalName(internalName) {
	return /^Capacity_Tier\d+$/i.test(internalName);
}

function compareSkillCandidates(left, right) {
	return (
		left.perkSlug.localeCompare(right.perkSlug) ||
		categorySort(left.category, right.category) ||
		compareOptionalNumber(left.tierNumber, right.tierNumber) ||
		compareOptionalNumber(left.treeOrder, right.treeOrder) ||
		left.candidateSkillName.localeCompare(right.candidateSkillName)
	);
}

function categorySort(left, right) {
	return (CATEGORY_ORDER.get(left) ?? 99) - (CATEGORY_ORDER.get(right) ?? 99);
}

function compareOptionalNumber(left, right) {
	if (left === undefined && right === undefined) {
		return 0;
	}
	if (left === undefined) {
		return 1;
	}
	if (right === undefined) {
		return -1;
	}
	return left - right;
}

async function scanFmodelExports(exportRoot, candidates, options) {
	const scan = {
		enabled: true,
		exportRoot,
		filesScanned: 0,
		filesSkipped: 0,
		matchesRecorded: 0,
		warnings: []
	};
	const files = await listFilesRecursive(exportRoot, (filePath) =>
		TEXT_EXPORT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
	);
	const searchSpecs = candidates.map((candidate) => ({
		candidate,
		variants: createSearchVariants(candidate)
	}));

	for (const filePath of files) {
		const fileStat = await stat(filePath);
		if (fileStat.size > options.maxFileBytes) {
			scan.filesSkipped += 1;
			continue;
		}

		const text = await readFile(filePath, 'utf8');
		scan.filesScanned += 1;
		const lowerText = text.toLowerCase();
		for (const spec of searchSpecs) {
			if (spec.candidate.fmodelMatches.length >= options.matchesPerSkill) {
				continue;
			}

			const match = findVariantMatch(text, lowerText, spec.variants);
			if (!match) {
				continue;
			}

			spec.candidate.fmodelMatches.push({
				relativePath: toPortableRelativePath(exportRoot, filePath),
				bytes: fileStat.size,
				matchedVariant: match.variant,
				snippet: match.snippet
			});
			scan.matchesRecorded += 1;
		}
	}

	return scan;
}

function createSearchVariants(candidate) {
	const names = [candidate.candidateSkillName, candidate.internalName, ...candidate.alternateNames];
	const variants = [];
	for (const name of names.filter(Boolean)) {
		variants.push(name, name.replace(/\s+/g, ''), name.replace(/\s+/g, '_'));
	}
	const slugTail = candidate.candidateSkillSlug.replace(`${candidate.perkSlug}-`, '');
	const pascalishSlugTail = slugTail
		.split('-')
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join('');
	variants.push(slugTail, pascalishSlugTail);
	return [...new Set(variants)].filter(Boolean);
}

function findVariantMatch(text, lowerText, variants) {
	for (const variant of variants) {
		const index = lowerText.indexOf(variant.toLowerCase());
		if (index === -1) {
			continue;
		}

		return {
			variant,
			snippet: createSnippet(text, index, variant.length)
		};
	}
	return undefined;
}

function createSnippet(text, index, length) {
	const start = Math.max(0, index - 160);
	const end = Math.min(text.length, index + length + 160);
	const prefix = start > 0 ? '…' : '';
	const suffix = end < text.length ? '…' : '';
	return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function groupCandidatesByPerk(candidates) {
	const perkMap = new Map();
	for (const candidate of candidates) {
		const perk = perkMap.get(candidate.perkSlug) ?? {
			perkSlug: candidate.perkSlug,
			skills: [],
			skillTree: Object.fromEntries(SKILL_CATEGORIES.map((category) => [category, []]))
		};

		const serialized = serializeCandidate(candidate);
		perk.skills.push(serialized);
		if (candidate.category && candidate.tierNumber) {
			let tier = perk.skillTree[candidate.category].find(
				(existing) => existing.tierNumber === candidate.tierNumber
			);
			if (!tier) {
				tier = {
					category: candidate.category,
					tierNumber: candidate.tierNumber,
					unlockLevel: candidate.unlockLevel,
					skills: []
				};
				perk.skillTree[candidate.category].push(tier);
			}
			tier.skills.push(serialized);
		}
		perkMap.set(candidate.perkSlug, perk);
	}

	const perks = [...perkMap.values()].sort((left, right) => left.perkSlug.localeCompare(right.perkSlug));
	for (const perk of perks) {
		perk.skills.sort(compareSerializedSkills);
		for (const category of SKILL_CATEGORIES) {
			perk.skillTree[category].sort((left, right) => left.tierNumber - right.tierNumber);
			for (const tier of perk.skillTree[category]) {
				tier.skills.sort(compareSerializedSkills);
			}
		}
	}
	return perks;
}

function serializeCandidate(candidate) {
	const serialized = {
		perkSlug: candidate.perkSlug,
		candidateSkillSlug: candidate.candidateSkillSlug,
		candidateSkillName: candidate.candidateSkillName,
		collectionStatus: candidate.collectionStatus,
		previewFiles: candidate.previewFiles,
		fmodelMatches: candidate.fmodelMatches,
		notes: [...candidate.notes].sort()
	};

	if (candidate.alternateNames.size > 0) {
		serialized.alternateNames = [...candidate.alternateNames].sort();
	}
	if (candidate.alternateSkillSlugs.size > 0) {
		serialized.alternateSkillSlugs = [...candidate.alternateSkillSlugs].sort();
	}
	for (const key of [
		'internalName',
		'category',
		'skillNumber',
		'tierNumber',
		'treeOrder',
		'unlockLevel',
		'description'
	]) {
		if (candidate[key] !== undefined) {
			serialized[key] = candidate[key];
		}
	}
	if (Object.keys(candidate.gameSources).length > 0) {
		serialized.gameSources = candidate.gameSources;
	}
	return serialized;
}

function compareSerializedSkills(left, right) {
	return (
		categorySort(left.category, right.category) ||
		compareOptionalNumber(left.tierNumber, right.tierNumber) ||
		compareOptionalNumber(left.treeOrder, right.treeOrder) ||
		left.candidateSkillName.localeCompare(right.candidateSkillName)
	);
}

function refreshCollectionStatus(candidate) {
	const parts = [];
	if (candidate.previewFiles.length > 0) {
		parts.push('preview');
	}
	if (candidate.description) {
		parts.push('locres-description');
	}
	if (candidate.tierNumber) {
		parts.push('raw-skill-tree-tier');
	}
	if (candidate.fmodelMatches.length > 0) {
		parts.push('fmodel-export-match');
	}
	candidate.collectionStatus = parts.length > 0 ? parts.join('+') : 'candidate-only';
}

function pascalToWords(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replaceAll('_', ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function writeCollection(outDir, collection) {
	await mkdir(outDir, { recursive: true });
	await writeFile(
		path.join(outDir, 'skill-candidates.json'),
		`${JSON.stringify(collection, null, 2)}\n`,
		'utf8'
	);
	await writeFile(path.join(outDir, 'skill-candidates.md'), renderMarkdownReport(collection), 'utf8');
}

function renderMarkdownReport(collection) {
	const lines = [
		'# KF3 Skill Candidate Collection',
		'',
		`Generated: ${collection.generatedAt}`,
		'',
		'## Summary',
		'',
		`- Package files: ${collection.summary.packageCount}`,
		`- Skill preview files: ${collection.summary.skillPreviewCount}`,
		`- Preview-derived candidate skills: ${collection.summary.previewCandidateSkillCount}`,
		`- Total candidate skills: ${collection.summary.candidateSkillCount}`,
		`- Candidate skills with descriptions: ${collection.summary.candidateSkillsWithDescriptions}`,
		`- Candidate skills with tier positions: ${collection.summary.candidateSkillsWithTier}`,
		`- Candidate skills with unlock levels: ${collection.summary.candidateSkillsWithUnlockLevel}`,
		`- Locres skill records: ${collection.summary.locresSkillRecords}`,
		`- Raw skill-tree assets parsed: ${collection.summary.rawSkillTreeAssets}`,
		`- Raw skill-tree skill references: ${collection.summary.rawSkillTreeSkillReferences}`,
		`- FModel files scanned: ${collection.summary.fmodelFilesScanned}`,
		`- FModel matches recorded: ${collection.summary.fmodelMatchesRecorded}`,
		''
	];

	if (collection.levelRequirements) {
		lines.push('## Level requirements used for unlock levels', '');
		for (const category of SKILL_CATEGORIES) {
			lines.push(`- ${category}: ${collection.levelRequirements[category]?.join(', ') ?? 'missing'}`);
		}
		lines.push('');
	}

	if (collection.summary.duplicateCandidateSkillSlugs.length > 0) {
		lines.push('## Duplicate preview-derived candidate skill slugs', '');
		for (const duplicate of collection.summary.duplicateCandidateSkillSlugs) {
			lines.push(`- ${duplicate.candidateSkillSlug}: ${duplicate.count} preview files`);
		}
		lines.push('');
	}

	if (collection.warnings.length > 0) {
		lines.push('## Warnings', '');
		for (const warning of collection.warnings) {
			lines.push(`- ${warning}`);
		}
		lines.push('');
	}

	for (const perk of collection.perks) {
		lines.push(`## ${perk.perkSlug}`, '');
		for (const category of SKILL_CATEGORIES) {
			const tiers = perk.skillTree[category];
			if (tiers.length === 0) {
				continue;
			}
			lines.push(`### ${category}`, '');
			for (const tier of tiers) {
				lines.push(`#### Tier ${tier.tierNumber} — unlock level ${tier.unlockLevel ?? 'unknown'}`, '');
				for (const skill of tier.skills) {
					const description = skill.description ? ` — ${truncate(skill.description, 180)}` : '';
					lines.push(`- **${skill.candidateSkillName}** \`${skill.candidateSkillSlug}\`${description}`);
				}
				lines.push('');
			}
		}
	}

	return `${lines.join('\n')}\n`;
}

function truncate(value, maxLength) {
	const compact = value.replace(/\s+/g, ' ').trim();
	if (compact.length <= maxLength) {
		return compact;
	}
	return `${compact.slice(0, maxLength - 1)}…`;
}

function printSummary(outDir, collection) {
	console.log(`Skill candidates written to ${path.join(outDir, 'skill-candidates.json')}`);
	console.log(`Report written to ${path.join(outDir, 'skill-candidates.md')}`);
	console.log(JSON.stringify(collection.summary, null, 2));
	if (collection.warnings.length > 0) {
		console.log('\nWarnings:');
		for (const warning of collection.warnings) {
			console.log(`- ${warning}`);
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack ?? error.message : error);
	process.exit(1);
});
