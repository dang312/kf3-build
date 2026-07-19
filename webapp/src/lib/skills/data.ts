import commandoJson from '../../../data/skill/character/commando.json' with { type: 'json' };
import engineerJson from '../../../data/skill/character/engineer.json' with { type: 'json' };
import firebugJson from '../../../data/skill/character/firebug.json' with { type: 'json' };
import medicJson from '../../../data/skill/character/medic.json' with { type: 'json' };
import ninjaJson from '../../../data/skill/character/ninja.json' with { type: 'json' };
import sharpshooterJson from '../../../data/skill/character/sharpshooter.json' with { type: 'json' };
import levelRequirementsJson from '../../../data/skill/level_requirement.json' with { type: 'json' };
import perkRegistryJson from '../../../data/skill/perk_registry.json' with { type: 'json' };
import skillRankRulesJson from '../../../data/skill/rank_rules.json' with { type: 'json' };
import {
	SKILL_CATEGORIES,
	type PerkLevel,
	type PerkSkillData,
	type PerkSlug,
	type PerkSlugMigrationMap,
	type PerkSummary,
	type SkillCategory,
	type SkillRank,
	type SkillSlug,
	type SkillSlugMigrationMap
} from './types.ts';

export const perkSlugMigrations: PerkSlugMigrationMap = {};
export const skillSlugMigrations: SkillSlugMigrationMap = {};

export const levelRequirements = normalizeLevelRequirements(levelRequirementsJson);
export const skillRankCap = normalizeSkillRankCap(skillRankRulesJson);

export const perkSkillData = validatePerkSkillData(
	applySkillRankCap([
		commandoJson,
		engineerJson,
		firebugJson,
		medicJson,
		ninjaJson,
		sharpshooterJson
	] as unknown as PerkSkillData[])
);

const perkRegistry = perkRegistryJson as unknown as { perks: PerkSummary[] };
const perkBySlug = new Map(perkSkillData.map((perk) => [perk.slug, perk]));

export function getPerkOptions(): PerkSummary[] {
	return perkSkillData.map((perk) => ({
		slug: perk.slug,
		name: perk.name,
		character: perk.character,
		skillCount: countSkills(perk),
		unplacedSkillCandidateCount: perk.unplacedSkillCandidates?.length ?? 0,
		file: perkRegistry.perks.find((entry) => entry.slug === perk.slug)?.file
	}));
}

export function getPerkBySlug(perkSlug: PerkSlug): PerkSkillData | undefined {
	return perkBySlug.get(resolvePerkSlug(perkSlug));
}

export function resolvePerkSlug(perkSlug: PerkSlug): PerkSlug {
	return perkSlugMigrations[perkSlug] ?? perkSlug;
}

export function resolveSkillSlug(skillSlug: SkillSlug): SkillSlug {
	return skillSlugMigrations[skillSlug] ?? skillSlug;
}

export function getDefaultPerkSlug(): PerkSlug {
	return perkSkillData[0]?.slug ?? '';
}

export function getMaxSupportedPerkLevel(): PerkLevel {
	return Math.max(...Object.values(levelRequirements).flat());
}

export function getTierUnlockLevel(
	category: SkillCategory,
	tierNumber: number
): PerkLevel | undefined {
	return levelRequirements[category]?.[tierNumber - 1];
}

export function countSkills(perk: PerkSkillData): number {
	return SKILL_CATEGORIES.reduce(
		(total, category) =>
			total +
			perk.skillTable[category].reduce((categoryTotal, tier) => categoryTotal + tier.length, 0),
		0
	);
}

function normalizeLevelRequirements(raw: unknown): Record<SkillCategory, PerkLevel[]> {
	const input = raw as Partial<Record<SkillCategory, unknown>>;
	return Object.fromEntries(
		SKILL_CATEGORIES.map((category) => {
			const values = input[category];
			if (!Array.isArray(values)) {
				throw new Error(`Missing level requirements for ${category}`);
			}
			return [category, values.map((value) => Number(value))];
		})
	) as Record<SkillCategory, PerkLevel[]>;
}

function normalizeSkillRankCap(raw: unknown): SkillRank {
	const value = Number((raw as { skillRankCap?: unknown }).skillRankCap);
	if (!Number.isInteger(value) || value < 1) {
		throw new Error('Game skill rank rules must define a positive whole-number skillRankCap.');
	}
	return value;
}

function applySkillRankCap(perks: PerkSkillData[]): PerkSkillData[] {
	return perks.map((perk) => ({
		...perk,
		skillTable: Object.fromEntries(
			SKILL_CATEGORIES.map((category) => [
				category,
				perk.skillTable[category].map((tier) =>
					tier.map((skill) => ({ ...skill, rankCap: skill.rankCap ?? skillRankCap }))
				)
			])
		) as PerkSkillData['skillTable']
	}));
}

function validatePerkSkillData(perks: PerkSkillData[]): PerkSkillData[] {
	const perkSlugs = new Set<PerkSlug>();
	const skillSlugs = new Set<SkillSlug>();

	for (const perk of perks) {
		if (!perk.slug) {
			throw new Error(`Perk data is missing a slug: ${perk.name}`);
		}
		if (perkSlugs.has(perk.slug)) {
			throw new Error(`Duplicate perk slug: ${perk.slug}`);
		}
		perkSlugs.add(perk.slug);

		for (const category of SKILL_CATEGORIES) {
			const tiers = perk.skillTable[category];
			if (!Array.isArray(tiers)) {
				throw new Error(`${perk.slug} is missing ${category} skill tiers`);
			}

			for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
				const tierNumber = tierIndex + 1;
				for (const skill of tiers[tierIndex]) {
					if (!skill.slug) {
						throw new Error(
							`${perk.slug} ${category} tier ${tierNumber} has a skill without a slug`
						);
					}
					if (skillSlugs.has(skill.slug)) {
						throw new Error(`Duplicate skill slug: ${skill.slug}`);
					}
					skillSlugs.add(skill.slug);
					if (skill.category && skill.category !== category) {
						throw new Error(
							`${skill.slug} has category ${skill.category} but is stored in ${category}`
						);
					}
					if (!Number.isInteger(skill.rankCap) || (skill.rankCap ?? -1) < 0) {
						throw new Error(`${skill.slug} is missing a valid nonnegative skill rank cap`);
					}
					if (skill.tierNumber && skill.tierNumber !== tierNumber) {
						throw new Error(
							`${skill.slug} has tier ${skill.tierNumber} but is stored in tier ${tierNumber}`
						);
					}
				}
			}
		}
	}

	return perks;
}
