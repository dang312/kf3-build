import { skillRankCap } from './data.ts';
import type {
	BuildState,
	PerkLevel,
	PerkSkillData,
	SkillOption,
	SkillRank,
	SkillSelection,
	SkillSelections,
	SkillSlot,
	SkillSlug
} from './types.ts';

export type BuildStateValidation = {
	valid: boolean;
	errors: string[];
};

export function getSkillRankCap(skill: SkillOption): SkillRank {
	return skill.rankCap ?? skillRankCap;
}

export function skillSlotKey(slot: SkillSlot): string {
	return `${slot.category}:${slot.tierNumber}`;
}

export function isSameSkillSlot(left: SkillSlot, right: SkillSlot): boolean {
	return left.category === right.category && left.tierNumber === right.tierNumber;
}

export function compareSkillSelections(left: SkillSelection, right: SkillSelection): number {
	return (
		left.category.localeCompare(right.category) ||
		left.tierNumber - right.tierNumber ||
		left.skillSlug.localeCompare(right.skillSlug) ||
		left.rank - right.rank
	);
}

export function getSelectionForSlot(
	selections: SkillSelections,
	slot: SkillSlot
): SkillSelection | undefined {
	return selections.find((selection) => isSameSkillSlot(selection, slot));
}

export function selectSkill(
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug,
	rank: SkillRank = 1
): SkillSelections {
	return [
		...selections.filter((selection) => !isSameSkillSlot(selection, slot)),
		{ ...slot, skillSlug, rank }
	].sort(compareSkillSelections);
}

export function setSkillRank(
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug,
	rank: SkillRank
): SkillSelections {
	return rank < 0 ? selections : selectSkill(selections, slot, skillSlug, rank);
}

export function clearSkillSelection(selections: SkillSelections, slot: SkillSlot): SkillSelections {
	return selections.filter((selection) => !isSameSkillSlot(selection, slot));
}

export function toggleSkillSelection(
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug
): SkillSelections {
	const existing = getSelectionForSlot(selections, slot);
	if (existing?.skillSlug === skillSlug) {
		return clearSkillSelection(selections, slot);
	}
	return selectSkill(selections, slot, skillSlug);
}

export function findSkillOption(
	perk: PerkSkillData,
	selection: SkillSelection
): SkillOption | undefined {
	return perk.skillTable[selection.category]?.[selection.tierNumber - 1]?.find(
		(skill) => skill.slug === selection.skillSlug
	);
}

export function findSkillOptionBySlug(
	perk: PerkSkillData,
	skillSlug: SkillSlug
): (SkillOption & SkillSlot) | undefined {
	for (const [category, tiers] of Object.entries(perk.skillTable)) {
		for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
			const skill = tiers[tierIndex].find((candidate) => candidate.slug === skillSlug);
			if (skill) {
				return { ...skill, category: category as SkillSlot['category'], tierNumber: tierIndex + 1 };
			}
		}
	}
	return undefined;
}

export function getSkillSlotUnlockLevel(
	perk: PerkSkillData,
	slot: SkillSlot
): PerkLevel | undefined {
	const tier = perk.skillTable[slot.category]?.[slot.tierNumber - 1];
	if (!tier || tier.length === 0) {
		return undefined;
	}
	return Math.min(...tier.map((skill) => skill.unlockLevel ?? Number.POSITIVE_INFINITY));
}

export function isSkillSlotUnlocked(
	perk: PerkSkillData,
	slot: SkillSlot,
	perkLevel: PerkLevel
): boolean {
	const unlockLevel = getSkillSlotUnlockLevel(perk, slot);
	return unlockLevel === undefined ? false : perkLevel >= unlockLevel;
}

export function hasSelectedPrerequisiteTiers(
	selections: SkillSelections,
	slot: SkillSlot
): boolean {
	for (let tierNumber = 1; tierNumber < slot.tierNumber; tierNumber += 1) {
		if (!getSelectionForSlot(selections, { category: slot.category, tierNumber })) {
			return false;
		}
	}
	return true;
}

export function isSkillSlotAvailable(
	perk: PerkSkillData,
	selections: SkillSelections,
	slot: SkillSlot,
	perkLevel: PerkLevel
): boolean {
	return (
		isSkillSlotUnlocked(perk, slot, perkLevel) && hasSelectedPrerequisiteTiers(selections, slot)
	);
}

export function setTieredSkillRank(
	perk: PerkSkillData,
	perkLevel: PerkLevel,
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug,
	rank: SkillRank
): SkillSelections {
	const skill = findSkillOption(perk, { ...slot, skillSlug, rank: 1 });
	if (!skill || rank < 0 || rank > getSkillRankCap(skill)) {
		return selections;
	}
	if (!isSkillSlotAvailable(perk, selections, slot, perkLevel)) {
		return selections;
	}

	return setSkillRank(selections, slot, skillSlug, rank);
}

export function selectTieredSkill(
	perk: PerkSkillData,
	perkLevel: PerkLevel,
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug
): SkillSelections {
	const existing = getSelectionForSlot(selections, slot);
	return existing?.skillSlug === skillSlug
		? selections
		: setTieredSkillRank(perk, perkLevel, selections, slot, skillSlug, 0);
}

export function upgradeTieredSkill(
	perk: PerkSkillData,
	perkLevel: PerkLevel,
	selections: SkillSelections,
	slot: SkillSlot,
	skillSlug: SkillSlug
): SkillSelections {
	const existing = getSelectionForSlot(selections, slot);
	return existing?.skillSlug === skillSlug
		? setTieredSkillRank(perk, perkLevel, selections, slot, skillSlug, existing.rank + 1)
		: selections;
}

export function isSkillSelectionUnlocked(
	perk: PerkSkillData,
	selection: SkillSelection,
	perkLevel: PerkLevel
): boolean {
	const skill = findSkillOption(perk, selection);
	if (!skill) {
		return false;
	}
	return perkLevel >= (skill.unlockLevel ?? getSkillSlotUnlockLevel(perk, selection) ?? 1);
}

export function validateBuildState(state: BuildState, perk: PerkSkillData): BuildStateValidation {
	const errors: string[] = [];
	if (state.perkSlug !== perk.slug) {
		errors.push(`Build perk ${state.perkSlug} does not match loaded perk ${perk.slug}.`);
	}

	const seenSlots = new Set<string>();
	for (const selection of state.skillSelections) {
		const slotKey = skillSlotKey(selection);
		if (seenSlots.has(slotKey)) {
			errors.push(
				`Duplicate skill selection for ${selection.category} tier ${selection.tierNumber}.`
			);
		}
		seenSlots.add(slotKey);

		const skill = findSkillOption(perk, selection);
		if (!skill) {
			errors.push(
				`Skill ${selection.skillSlug} is not available in ${selection.category} tier ${selection.tierNumber}.`
			);
		} else if (!Number.isInteger(selection.rank) || selection.rank < 0) {
			errors.push(`Skill ${selection.skillSlug} must have a nonnegative whole-number rank.`);
		} else if (selection.rank > getSkillRankCap(skill)) {
			errors.push(`Skill ${selection.skillSlug} cannot exceed rank ${getSkillRankCap(skill)}.`);
		}
		if (!hasSelectedPrerequisiteTiers(state.skillSelections, selection)) {
			errors.push(
				`Skill ${selection.skillSlug} requires selections in every earlier ${selection.category} tier.`
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
