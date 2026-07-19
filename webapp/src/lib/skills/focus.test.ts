import assert from 'node:assert/strict';
import test from 'node:test';
import { perkSkillData } from './data.ts';
import {
	findFocusedSkill,
	getDefaultFocusedSkill,
	isFocusedSkillLocked,
	listFocusableSkills
} from './focus.ts';

const commando = perkSkillData.find((perk) => perk.slug === 'commando');
if (!commando) {
	throw new Error('Expected commando perk data to load.');
}

test('focusable skills preserve category, tier, and skill identity for UI state', () => {
	const skills = listFocusableSkills(commando);
	assert.equal(skills.length, 35);
	assert.deepEqual(
		{ category: skills[0].category, tierNumber: skills[0].tierNumber, slug: skills[0].skill.slug },
		{ category: 'passives', tierNumber: 1, slug: 'commando-insider-trading' }
	);
});

test('default focused skill is the first available skill at the selected level', () => {
	assert.equal(getDefaultFocusedSkill(commando, 30)?.skill.slug, 'commando-insider-trading');
	assert.equal(getDefaultFocusedSkill(commando, 1)?.skill.slug, 'commando-insider-trading');
	assert.equal(isFocusedSkillLocked(getDefaultFocusedSkill(commando, 1)!, 1), true);
});

test('focused skill lookup keeps focus stable when level changes', () => {
	const focused = findFocusedSkill(commando, 'commando-hothead');
	if (!focused) {
		throw new Error('Expected commando-hothead focus data to load.');
	}
	assert.equal(focused.category, 'passives');
	assert.equal(focused.tierNumber, 2);
	assert.equal(isFocusedSkillLocked(focused, 30), false);
	assert.equal(isFocusedSkillLocked(focused, 2), true);
});
