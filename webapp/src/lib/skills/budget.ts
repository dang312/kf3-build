import type { OperationalBudget, PerkLevel, PerkSkillData } from './types.ts';

export type OperationalBudgetSummary = {
	budget: OperationalBudget | undefined;
	status: 'pending' | 'provisional' | 'verified';
	note?: string;
};

export function computeOperationalBudget(
	perk: PerkSkillData,
	perkLevel: PerkLevel
): OperationalBudgetSummary {
	const formula = perk.operationalBudgetFormula;
	if (!formula) {
		return {
			budget: undefined,
			status: 'pending',
			note: 'Starting Money is pending verification for this perk.'
		};
	}

	if (formula.type === 'linear') {
		const base = formula.parameters.base ?? 0;
		const perLevel = formula.parameters.perLevel ?? 0;
		return {
			budget: base + perLevel * perkLevel,
			status: formula.verificationStatus,
			note: formula.sourceNote
		};
	}

	return {
		budget: undefined,
		status: 'pending',
		note: `Unsupported Starting Money formula: ${formula.type}`
	};
}
