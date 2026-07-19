import assert from 'node:assert/strict';
import test from 'node:test';
import { getPerkBySlug } from './data.ts';
import {
	clearSkillSelection,
	getSelectionForSlot,
	getSkillRankCap,
	isSkillSlotAvailable,
	isSkillSlotUnlocked,
	selectSkill,
	selectTieredSkill,
	setTieredSkillRank,
	upgradeTieredSkill,
	toggleSkillSelection,
	validateBuildState
} from './selection.ts';
import type { BuildState, SkillSlot } from './types.ts';

const commando = getPerkBySlug('commando');
if (!commando) {
	throw new Error('Expected commando perk data to load.');
}

test('selecting a second skill in the same slot replaces the first selection', () => {
	const slot: SkillSlot = { category: 'passives', tierNumber: 1 };
	const first = selectSkill([], slot, 'commando-insider-trading');
	const replaced = selectSkill(first, slot, 'commando-fire-sale');

	assert.deepEqual(replaced, [{ ...slot, skillSlug: 'commando-fire-sale', rank: 1 }]);
});

test('toggle selection clears a skill when the selected card is pressed again', () => {
	const slot: SkillSlot = { category: 'gadget', tierNumber: 1 };
	const selected = toggleSkillSelection([], slot, 'commando-market-panic');
	assert.equal(getSelectionForSlot(selected, slot)?.skillSlug, 'commando-market-panic');
	assert.deepEqual(toggleSkillSelection(selected, slot, 'commando-market-panic'), []);
});

test('clear selection removes only the target skill slot', () => {
	const passiveSlot: SkillSlot = { category: 'passives', tierNumber: 1 };
	const gadgetSlot: SkillSlot = { category: 'gadget', tierNumber: 1 };
	const selections = selectSkill(
		selectSkill([], passiveSlot, 'commando-insider-trading'),
		gadgetSlot,
		'commando-market-panic'
	);

	assert.deepEqual(clearSkillSelection(selections, passiveSlot), [
		{ ...gadgetSlot, skillSlug: 'commando-market-panic', rank: 1 }
	]);
});

test('tier unlock checks use the selected perk level', () => {
	assert.equal(isSkillSlotUnlocked(commando, { category: 'passives', tierNumber: 1 }, 1), false);
	assert.equal(isSkillSlotUnlocked(commando, { category: 'passives', tierNumber: 1 }, 2), true);
	assert.equal(isSkillSlotUnlocked(commando, { category: 'gadget', tierNumber: 5 }, 29), false);
	assert.equal(isSkillSlotUnlocked(commando, { category: 'gadget', tierNumber: 5 }, 30), true);
});

test('a tier needs every preceding tier in its category selected', () => {
	const tierOne: SkillSlot = { category: 'throwable', tierNumber: 1 };
	const tierTwo: SkillSlot = { category: 'throwable', tierNumber: 2 };

	assert.equal(isSkillSlotAvailable(commando, [], tierTwo, 30), false);
	assert.deepEqual(selectTieredSkill(commando, 30, [], tierTwo, 'commando-capacity-tier2'), []);

	const tierOneSelected = selectTieredSkill(commando, 30, [], tierOne, 'commando-a-bigger-bang');
	assert.equal(isSkillSlotAvailable(commando, tierOneSelected, tierTwo, 30), true);

	const tierTwoSelected = selectTieredSkill(
		commando,
		30,
		tierOneSelected,
		tierTwo,
		'commando-capacity-tier2'
	);
	assert.equal(tierTwoSelected.length, 2);
	assert.deepEqual(
		setTieredSkillRank(commando, 30, tierTwoSelected, tierOne, 'commando-a-bigger-bang', 0),
		tierTwoSelected
	);
});

test('skills can be upgraded through the three-rank cap from local game UI data', () => {
	const slot: SkillSlot = { category: 'passives', tierNumber: 1 };
	const skill = commando.skillTable.passives[0].find(
		(candidate) => candidate.slug === 'commando-insider-trading'
	);
	if (!skill) throw new Error('Expected Insider Trading skill data to load.');

	assert.equal(getSkillRankCap(skill), 3);
	const selected = selectTieredSkill(commando, 30, [], slot, skill.slug);
	const firstPoint = upgradeTieredSkill(commando, 30, selected, slot, skill.slug);
	const secondPoint = upgradeTieredSkill(commando, 30, firstPoint, slot, skill.slug);
	const maxed = upgradeTieredSkill(commando, 30, secondPoint, slot, skill.slug);

	assert.equal(getSelectionForSlot(selected, slot)?.rank, 0);
	assert.equal(getSelectionForSlot(firstPoint, slot)?.rank, 1);
	assert.equal(getSelectionForSlot(secondPoint, slot)?.rank, 2);
	assert.equal(getSelectionForSlot(maxed, slot)?.rank, 3);
	assert.deepEqual(upgradeTieredSkill(commando, 30, maxed, slot, skill.slug), maxed);
});

test('non-upgradeable Capacity Increase remains equipped at rank zero', () => {
	const slot: SkillSlot = { category: 'throwable', tierNumber: 2 };
	const tierOne: SkillSlot = { category: 'throwable', tierNumber: 1 };
	const tierOneSelected = selectTieredSkill(commando, 30, [], tierOne, 'commando-a-bigger-bang');
	const selected = selectTieredSkill(
		commando,
		30,
		tierOneSelected,
		slot,
		'commando-capacity-tier2'
	);
	const capacity = commando.skillTable.throwable[1].find(
		(skill) => skill.slug === 'commando-capacity-tier2'
	);

	assert.equal(getSkillRankCap(capacity!), 0);
	assert.equal(getSelectionForSlot(selected, slot)?.rank, 0);
	assert.deepEqual(
		upgradeTieredSkill(commando, 30, selected, slot, 'commando-capacity-tier2'),
		selected
	);
});

test('refunding to rank zero retains a selected skill and later tier selections', () => {
	const tierOne: SkillSlot = { category: 'throwable', tierNumber: 1 };
	const tierTwo: SkillSlot = { category: 'throwable', tierNumber: 2 };
	const selections = setTieredSkillRank(
		commando,
		30,
		[
			{ ...tierOne, skillSlug: 'commando-a-bigger-bang', rank: 1 },
			{ ...tierTwo, skillSlug: 'commando-capacity-tier2', rank: 0 }
		],
		tierOne,
		'commando-a-bigger-bang',
		0
	);

	assert.deepEqual(selections, [
		{ ...tierOne, skillSlug: 'commando-a-bigger-bang', rank: 0 },
		{ ...tierTwo, skillSlug: 'commando-capacity-tier2', rank: 0 }
	]);
});

test('build-state validation rejects duplicate skill selections for the same slot', () => {
	const state: BuildState = {
		perkSlug: 'commando',
		perkLevel: 30,
		skillSelections: [
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-insider-trading', rank: 1 },
			{ category: 'passives', tierNumber: 1, skillSlug: 'commando-fire-sale', rank: 1 }
		]
	};

	const validation = validateBuildState(state, commando);
	assert.equal(validation.valid, false);
	assert.match(validation.errors.join('\n'), /Duplicate skill selection for passives tier 1/);
});
