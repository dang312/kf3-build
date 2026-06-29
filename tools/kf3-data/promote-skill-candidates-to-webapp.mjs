#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_COLLECTION_PATH = 'scratch/skill-collection/skill-candidates.json';
const DEFAULT_WEBAPP_SKILL_ROOT = 'webapp/data/skill';
const SKILL_CATEGORIES = ['passives', 'throwable', 'gadget'];
const PERK_DISPLAY = {
	commando: { name: 'Commando', character: 'Foster' },
	engineer: { name: 'Engineer', character: 'Imran' },
	firebug: { name: 'Firebug', character: 'Devlin' },
	medic: { name: 'Medic', character: 'Obi' },
	ninja: { name: 'Ninja', character: 'Nakata' },
	sharpshooter: { name: 'Sharpshooter', character: 'Luna' }
};

function parseArgs(argv) {
	const args = {
		collectionPath: DEFAULT_COLLECTION_PATH,
		webappSkillRoot: DEFAULT_WEBAPP_SKILL_ROOT
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--collection') {
			args.collectionPath = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--webapp-skill-root') {
			args.webappSkillRoot = requiredValue(argv, index, arg);
			index += 1;
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

function printHelp() {
	console.log(`Usage: node tools/kf3-data/promote-skill-candidates-to-webapp.mjs [options]\n\nPromotes the reviewable skill candidate collection into webapp/data/skill so the Svelte app can consume the current local game-file data. The full source collection is copied too, so source metadata remains available for later UI/data work.\n\nOptions:\n  --collection PATH          Skill candidate JSON. Defaults to ${DEFAULT_COLLECTION_PATH}\n  --webapp-skill-root PATH   Webapp skill data root. Defaults to ${DEFAULT_WEBAPP_SKILL_ROOT}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const collection = JSON.parse(await readFile(args.collectionPath, 'utf8'));
	await promoteCollection(args, collection);
}

async function promoteCollection(args, collection) {
	const characterDir = path.join(args.webappSkillRoot, 'character');
	const sourceDir = path.join(args.webappSkillRoot, 'source');
	await mkdir(characterDir, { recursive: true });
	await mkdir(sourceDir, { recursive: true });

	await writeJson(path.join(sourceDir, 'skill-candidates.json'), collection);
	const sourceReportPath = args.collectionPath.replace(/\.json$/i, '.md');
	try {
		await copyFile(sourceReportPath, path.join(sourceDir, 'skill-candidates.md'));
	} catch (error) {
		if (error?.code !== 'ENOENT') {
			throw error;
		}
	}

	const registry = [];
	for (const perk of collection.perks ?? []) {
		const perkData = buildPerkSkillData(perk, collection);
		registry.push({
			slug: perkData.slug,
			name: perkData.name,
			character: perkData.character,
			file: `character/${perkData.slug}.json`,
			skillCount: countSkillOptions(perkData.skillTable),
			unplacedSkillCandidateCount: perkData.unplacedSkillCandidates.length
		});
		await writeJson(path.join(characterDir, `${perkData.slug}.json`), perkData);
	}

	await writeJson(path.join(args.webappSkillRoot, 'perk_registry.json'), {
		generatedAt: collection.generatedAt,
		sourceCollection: 'source/skill-candidates.json',
		perks: registry.sort((left, right) => left.slug.localeCompare(right.slug))
	});

	console.log(`Promoted ${registry.length} perk data file(s) into ${characterDir}`);
	console.log(`Copied source collection into ${sourceDir}`);
}

function buildPerkSkillData(perk, collection) {
	const display = PERK_DISPLAY[perk.perkSlug] ?? {
		name: titleCase(perk.perkSlug),
		character: ''
	};
	const tieredSkills = (perk.skills ?? []).filter(isTieredSkillCandidate);
	const unplacedSkillCandidates = (perk.skills ?? []).filter((skill) => !isTieredSkillCandidate(skill));
	const skillTable = Object.fromEntries(
		SKILL_CATEGORIES.map((category) => [category, buildCategoryTiers(category, tieredSkills)])
	);

	return {
		slug: perk.perkSlug,
		name: display.name,
		character: display.character,
		dataStatus: 'candidate-extracted',
		source: {
			collectionGeneratedAt: collection.generatedAt,
			collectionSource: 'webapp/data/skill/source/skill-candidates.json',
			collectionReport: 'webapp/data/skill/source/skill-candidates.md',
			collectionSummary: collection.summary,
			levelRequirements: collection.levelRequirements,
			notes: [
				'Generated from local KF3/Nightfall files by tools/kf3-data/promote-skill-candidates-to-webapp.mjs.',
				'Each skill.source preserves the original collected candidate record, including locres keys, raw skill-tree asset paths, preview files, collection status, and notes.',
				'Descriptions still contain game markup and unresolved locres placeholders such as {0}; value extraction is a later normalization step.'
			]
		},
		skillTable,
		proficiency: [],
		unplacedSkillCandidates
	};
}

function isTieredSkillCandidate(skill) {
	return SKILL_CATEGORIES.includes(skill.category) && Number.isInteger(skill.tierNumber);
}

function buildCategoryTiers(category, tieredSkills) {
	const categorySkills = tieredSkills
		.filter((skill) => skill.category === category)
		.sort(compareTieredSkills);
	const maxTierNumber = Math.max(0, ...categorySkills.map((skill) => skill.tierNumber));
	const tiers = Array.from({ length: maxTierNumber }, () => []);

	for (const candidate of categorySkills) {
		tiers[candidate.tierNumber - 1].push(toSkillOption(candidate));
	}

	return tiers;
}

function compareTieredSkills(left, right) {
	return (
		left.tierNumber - right.tierNumber ||
		(left.treeOrder ?? 0) - (right.treeOrder ?? 0) ||
		(left.skillNumber ?? 0) - (right.skillNumber ?? 0) ||
		left.candidateSkillSlug.localeCompare(right.candidateSkillSlug)
	);
}

function toSkillOption(candidate) {
	return {
		slug: candidate.candidateSkillSlug,
		name: candidate.candidateSkillName,
		category: candidate.category,
		tierNumber: candidate.tierNumber,
		unlockLevel: candidate.unlockLevel,
		internalName: candidate.internalName,
		treeOrder: candidate.treeOrder,
		skillNumber: candidate.skillNumber,
		effect: {
			type: candidate.category,
			description: candidate.description ?? ''
		},
		source: candidate
	};
}

function countSkillOptions(skillTable) {
	return Object.values(skillTable).reduce(
		(categoryTotal, tiers) =>
			categoryTotal + tiers.reduce((tierTotal, tier) => tierTotal + tier.length, 0),
		0
	);
}

function titleCase(value) {
	return value
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

async function writeJson(filePath, value) {
	await writeFile(filePath, `${JSON.stringify(value, null, '\t')}\n`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
