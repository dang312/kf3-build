import { computeOperationalBudget } from './budget.ts';
import { formatSkillDescription } from './format.ts';
import {
	findSkillOption,
	getSelectionForSlot,
	getSkillSlotUnlockLevel,
	hasSelectedPrerequisiteTiers,
	isSkillSelectionUnlocked,
	skillSlotKey,
	validateBuildState
} from './selection.ts';
import {
	SKILL_CATEGORIES,
	type BuildState,
	type BuildSummary,
	type BuildSummarySlot,
	type PerkSkillData,
	type SkillSelection
} from './types.ts';

export function buildSummaryForState(state: BuildState, perk: PerkSkillData): BuildSummary {
	const validation = validateBuildState(state, perk);
	const warnings = [...validation.errors];
	const activeSkills: BuildSummary['activeSkills'] = [];
	const lockedSkills: BuildSummary['lockedSkills'] = [];
	const invalidSelections: SkillSelection[] = [];
	const duplicateSlots = findDuplicateSelectionSlots(state.skillSelections);

	for (const selection of state.skillSelections) {
		if (duplicateSlots.has(skillSlotKey(selection))) {
			continue;
		}

		const skill = findSkillOption(perk, selection);
		if (!skill) {
			invalidSelections.push(selection);
			continue;
		}

		const unlockLevel = skill.unlockLevel ?? getSkillSlotUnlockLevel(perk, selection) ?? 1;
		const summarySkill = {
			category: selection.category,
			tierNumber: selection.tierNumber,
			skill,
			rank: selection.rank,
			unlockLevel,
			description: formatSkillDescription(skill, selection.rank)
		};

		const skillUnlocked = isSkillSelectionUnlocked(perk, selection, state.perkLevel);
		const prerequisitesMet = hasSelectedPrerequisiteTiers(state.skillSelections, selection);
		if (skillUnlocked && prerequisitesMet) {
			activeSkills.push(summarySkill);
		} else {
			lockedSkills.push(summarySkill);
			warnings.push(
				skillUnlocked
					? `${skill.name} requires selections in every earlier ${selection.category} tier and is excluded from the active Build Summary.`
					: `${skill.name} is locked until level ${unlockLevel} and is excluded from the active Build Summary.`
			);
		}
	}

	const unlockedSlots = getUnlockedSlots(state, perk);
	const activeSlotKeys = new Set(activeSkills.map(skillSlotKey));
	const incompleteUnlockedSlots = unlockedSlots.filter(
		(slot) => !activeSlotKeys.has(skillSlotKey(slot))
	);
	const budget = computeOperationalBudget(perk, state.perkLevel);

	if (incompleteUnlockedSlots.length > 0) {
		warnings.push(
			`${incompleteUnlockedSlots.length} unlocked skill tier(s) do not have a selected skill.`
		);
	}
	if (budget.note) {
		warnings.push(budget.note);
	}

	return {
		perk,
		perkLevel: state.perkLevel,
		selectedSkillCount: state.skillSelections.length,
		activeSkillCount: activeSkills.length,
		unlockedSlotCount: unlockedSlots.length,
		activeSkills,
		lockedSkills,
		invalidSelections,
		incompleteUnlockedSlots,
		warnings,
		operationalBudget: budget.budget,
		operationalBudgetStatus: budget.status,
		operationalBudgetNote: budget.note
	};
}

function getUnlockedSlots(state: BuildState, perk: PerkSkillData): BuildSummarySlot[] {
	const slots: BuildSummarySlot[] = [];
	for (const category of SKILL_CATEGORIES) {
		const tiers = perk.skillTable[category];
		for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
			const tierNumber = tierIndex + 1;
			const unlockLevel = getSkillSlotUnlockLevel(perk, { category, tierNumber });
			if (unlockLevel === undefined || state.perkLevel < unlockLevel) {
				continue;
			}
			const selection = getSelectionForSlot(state.skillSelections, { category, tierNumber });
			slots.push({ category, tierNumber, unlockLevel, selectedSkillSlug: selection?.skillSlug });
		}
	}
	return slots;
}

function findDuplicateSelectionSlots(selections: SkillSelection[]): Set<string> {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const selection of selections) {
		const key = skillSlotKey(selection);
		if (seen.has(key)) {
			duplicates.add(key);
		}
		seen.add(key);
	}
	return duplicates;
}
