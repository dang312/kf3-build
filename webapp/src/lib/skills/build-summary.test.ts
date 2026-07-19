import assert from 'node:assert/strict';
import test from 'node:test';
import { getPerkBySlug } from './data.ts';
import { buildSummaryForState } from './build-summary.ts';
import type { BuildState } from './types.ts';

const commando = getPerkBySlug('commando');
if (!commando) {
	throw new Error('Expected commando perk data to load.');
}

test('build summary includes selected unlocked skills and pending budget status', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 30,
		skillSelections: [
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-insider-trading', rank: 1 },
			{ category: 'throwable', tierNumber: 1, skillSlug: 'commando-a-bigger-bang', rank: 1 },
			{ category: 'gadget', tierNumber: 1, skillSlug: 'commando-acceptable-damage', rank: 1 }
		]
	};

	const summary = buildSummaryForState(state, commando);
	assert.equal(summary.activeSkillCount, 3);
	assert.equal(summary.lockedSkills.length, 0);
	assert.equal(summary.operationalBudgetStatus, 'pending');
	assert.match(summary.activeSkills[0].description, /Maximum armor integrity/);
});

test('rank-zero equipped skills apply their base effect', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 30,
		skillSelections: [
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-insider-trading', rank: 0 },
			{ category: 'passives', tierNumber: 2, skillSlug: 'commando-hothead', rank: 0 }
		]
	};

	const summary = buildSummaryForState(state, commando);
	assert.equal(summary.activeSkillCount, 2);
	assert.equal(
		summary.activeSkills[0].description,
		'Maximum armor integrity is increased by [10].\n\nArmor costs from the trader are reduced by [-10%].'
	);
	assert.equal(
		summary.incompleteUnlockedSlots.some(
			(slot) => slot.category === 'passives' && slot.tierNumber === 2
		),
		false
	);
});

test('non-upgradeable Capacity Increase applies its fixed effect at rank zero', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 30,
		skillSelections: [
			{ category: 'throwable', tierNumber: 1, skillSlug: 'commando-a-bigger-bang', rank: 0 },
			{ category: 'throwable', tierNumber: 2, skillSlug: 'commando-capacity-tier2', rank: 0 }
		]
	};

	const summary = buildSummaryForState(state, commando);
	const capacity = summary.activeSkills.find(
		(entry) => entry.skill.slug === 'commando-capacity-tier2'
	);
	assert.equal(capacity?.description, 'Throwable carrying capacity is increased by 1.');
});

test('lowering level keeps but excludes locked selected skills from the active summary', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 1,
		skillSelections: [
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-insider-trading', rank: 1 },
			{ category: 'gadget', tierNumber: 5, skillSlug: 'commando-smog-warning', rank: 1 }
		]
	};

	const summary = buildSummaryForState(state, commando);
	assert.equal(summary.activeSkillCount, 0);
	assert.deepEqual(
		summary.lockedSkills.map((entry) => [entry.skill.slug, entry.unlockLevel]),
		[
			['commando-insider-trading', 2],
			['commando-smog-warning', 30]
		]
	);
	assert.match(summary.warnings.join('\n'), /Smog Warning is locked until level 30/);
});

test('build summary reports incomplete unlocked tiers', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 6,
		skillSelections: [
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-fire-sale', rank: 1 }
		]
	};

	const summary = buildSummaryForState(state, commando);
	assert.equal(summary.unlockedSlotCount, 3);
	assert.deepEqual(
		summary.incompleteUnlockedSlots.map((slot) => [slot.category, slot.tierNumber]),
		[
			['throwable', 1],
			['gadget', 1]
		]
	);
});
