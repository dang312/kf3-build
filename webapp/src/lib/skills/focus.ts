import { getSkillSlotUnlockLevel } from './selection.ts';
import {
	SKILL_CATEGORIES,
	type PerkLevel,
	type PerkSkillData,
	type SkillOption,
	type SkillSlot,
	type SkillSlug
} from './types.ts';

export type FocusedSkill = SkillSlot & {
	skill: SkillOption;
	unlockLevel?: PerkLevel;
};

export function listFocusableSkills(perk: PerkSkillData): FocusedSkill[] {
	return SKILL_CATEGORIES.flatMap((category) =>
		perk.skillTable[category].flatMap((tier, tierIndex) => {
			const tierNumber = tierIndex + 1;
			const unlockLevel = getSkillSlotUnlockLevel(perk, { category, tierNumber });
			return tier.map((skill) => ({ category, tierNumber, unlockLevel, skill }));
		})
	);
}

export function findFocusedSkill(
	perk: PerkSkillData,
	skillSlug: SkillSlug | undefined
): FocusedSkill | undefined {
	if (!skillSlug) {
		return undefined;
	}
	return listFocusableSkills(perk).find((entry) => entry.skill.slug === skillSlug);
}

export function getDefaultFocusedSkill(
	perk: PerkSkillData,
	perkLevel: PerkLevel
): FocusedSkill | undefined {
	const skills = listFocusableSkills(perk);
	return skills.find((entry) => !isFocusedSkillLocked(entry, perkLevel)) ?? skills[0];
}

export function isFocusedSkillLocked(focusedSkill: FocusedSkill, perkLevel: PerkLevel): boolean {
	return (
		perkLevel <
		(focusedSkill.skill.unlockLevel ?? focusedSkill.unlockLevel ?? Number.POSITIVE_INFINITY)
	);
}
