import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDescriptionLines, formatDescriptionText, formatSkillDescription } from './format.ts';
import type { SkillOption } from './types.ts';

test('formats game markup as safe plain text without using raw HTML', () => {
	assert.equal(
		formatDescriptionText(
			'Deal <Emp>[{0}%]</> Ballistic <img id="Ballistic"/> damage.<cf><cf><b>Stacks</b> refresh.'
		),
		'Deal [{0}%] Ballistic [Ballistic] damage.\n\nStacks refresh.'
	);
});

test('formats named placeholder ranges when scaling values are present', () => {
	const skill: SkillOption = {
		slug: 'test-skill',
		name: 'Test Skill',
		effect: {
			description: 'Maximum armor is increased by {{X}}.',
			values: { X: [20, 30, 40, 50] }
		}
	};

	assert.equal(formatSkillDescription(skill), 'Maximum armor is increased by 20–50.');
});

test('resolves positional game placeholders using the spent skill rank', () => {
	const skill: SkillOption = {
		slug: 'test-skill',
		name: 'Test Skill',
		rankCap: 3,
		effect: {
			description: 'Damage is increased by [{0}%].',
			values: { 0: [5, 10, 20, 30] }
		}
	};

	assert.equal(formatSkillDescription(skill, 0), 'Damage is increased by [5%].');
	assert.equal(formatSkillDescription(skill, 1), 'Damage is increased by [10%].');
	assert.equal(formatSkillDescription(skill, 3), 'Damage is increased by [30%].');
});

test('splits formatted descriptions into display lines', () => {
	const skill: SkillOption = {
		slug: 'test-skill',
		name: 'Test Skill',
		effect: {
			description: 'First line.<cf><cf>Second line.'
		}
	};

	assert.deepEqual(formatDescriptionLines(skill), ['First line.', 'Second line.']);
});

test('keeps blank descriptions blank so missing game data is fixed at the source', () => {
	const skill: SkillOption = {
		slug: 'test-skill',
		name: 'Test Skill',
		effect: {
			description: ''
		}
	};

	assert.equal(formatSkillDescription(skill), '');
});
