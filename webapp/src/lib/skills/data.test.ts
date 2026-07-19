import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';
import {
	getMaxSupportedPerkLevel,
	getPerkOptions,
	levelRequirements,
	skillRankCap,
	perkSkillData
} from './data.ts';
import { formatSkillDescription } from './format.ts';
import { SKILL_CATEGORIES } from './types.ts';

test('loads extracted skill trees for every perk', () => {
	assert.equal(perkSkillData.length, 6);
	assert.deepEqual(perkSkillData.map((perk) => perk.slug).sort(), [
		'commando',
		'engineer',
		'firebug',
		'medic',
		'ninja',
		'sharpshooter'
	]);

	for (const perk of perkSkillData) {
		for (const category of SKILL_CATEGORIES) {
			assert.equal(perk.skillTable[category].length, 5, `${perk.slug} ${category} tier count`);
		}
	}
});

test('promoted skill data keeps source metadata for later normalization', () => {
	const commando = perkSkillData.find((perk) => perk.slug === 'commando');
	if (!commando) {
		throw new Error('Expected commando perk data to load.');
	}
	const hothead = commando.skillTable.passives[1].find(
		(skill) => skill.slug === 'commando-hothead'
	);
	if (!hothead) {
		throw new Error('Expected commando-hothead skill data to load.');
	}
	assert.equal(hothead.source?.collectionStatus, 'preview+locres-description+raw-skill-tree-tier');
	assert.equal(
		hothead.source?.gameSources?.rawSkillTreeAsset,
		'Nightfall/Content/Characters/Specialists/Commando/Skills/SPEC_Foster_PassiveSkillTree.uasset'
	);
	assert.ok(hothead.source?.gameSources?.locresDescriptionKey);
	assert.ok((hothead.source?.previewFiles.length ?? 0) > 0);
});

test('promoted skill icons use stable public paths and source metadata when available', () => {
	const skills = perkSkillData.flatMap((perk) =>
		SKILL_CATEGORIES.flatMap((category) => perk.skillTable[category].flat())
	);
	const skillsWithIcons = skills.filter((skill) => skill.icon);
	assert.equal(skills.length, 210);
	assert.equal(skillsWithIcons.length, 209);
	const skillsWithoutIcons = skills.filter((skill) => !skill.icon);
	assert.deepEqual(
		skillsWithoutIcons.map((skill) => skill.slug),
		['ninja-unyielding']
	);
	assert.equal(skillsWithoutIcons[0].source?.iconSource?.collectionStatus, 'missing');

	for (const skill of skillsWithIcons) {
		assert.match(skill.icon ?? '', /^\/skill-icons\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/);
		assert.ok(existsSync(`static${skill.icon}`), `${skill.slug} icon file should exist`);
		assert.equal(skill.source?.iconSource?.collectionStatus, 'generated-high-confidence');
		assert.equal(skill.source?.iconSource?.publicPath, skill.icon);
		assert.equal(skill.source?.iconSource?.rendering?.method, 'rgb-mask-ingame-silhouette');
		assert.equal(skill.source?.iconSource?.sourceTexture.width, 256);
		assert.equal(skill.source?.iconSource?.sourceTexture.height, 256);
		assert.equal(skill.source?.iconSource?.output.width, 512);
		assert.equal(skill.source?.iconSource?.output.height, 512);
		assert.ok(skill.source?.gameSources?.iconAsset?.includes('/SpecialistSkillIcons/'));
	}
});

test('promoted skill icons are high-contrast enough for compact in-game-style nodes', async () => {
	const skills = perkSkillData.flatMap((perk) =>
		SKILL_CATEGORIES.flatMap((category) => perk.skillTable[category].flat())
	);
	const skillsWithIcons = skills.filter((skill) => skill.icon);
	assert.equal(skillsWithIcons.length, 209);

	for (const skill of skillsWithIcons) {
		const metrics = await getIconVisibilityMetrics(`static${skill.icon}`);
		assert.equal(metrics.width, 512, `${skill.slug} icon should export high-resolution width`);
		assert.equal(metrics.height, 512, `${skill.slug} icon should export high-resolution height`);
		assert.ok(
			metrics.alphaMean >= 10,
			`${skill.slug} icon should not be too transparent: ${metrics.alphaMean}`
		);
		assert.ok(
			metrics.brightOpaqueCoverage >= 0.035,
			`${skill.slug} icon should have enough bright glyph coverage: ${metrics.brightOpaqueCoverage}`
		);
		if (skill.slug === 'commando-hothead') {
			assert.ok(
				metrics.brightOpaqueCoverage >= 0.25,
				'commando-hothead should render as a crisp filled in-game silhouette, not a thin blurry outline'
			);
		}
	}
});

async function getIconVisibilityMetrics(iconPath: string) {
	const { data, info } = await sharp(iconPath).ensureAlpha().raw().toBuffer({
		resolveWithObject: true
	});
	let alphaTotal = 0;
	let brightOpaquePixels = 0;
	let visiblePixels = 0;
	for (let offset = 0; offset < data.length; offset += 4) {
		const red = data[offset];
		const green = data[offset + 1];
		const blue = data[offset + 2];
		const alpha = data[offset + 3];
		const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
		alphaTotal += alpha;
		if (alpha >= 64) {
			visiblePixels += 1;
		}
		if (alpha >= 128 && luma >= 180) {
			brightOpaquePixels += 1;
		}
	}
	const pixelCount = info.width * info.height;
	return {
		width: info.width,
		height: info.height,
		alphaMean: alphaTotal / pixelCount,
		brightOpaqueCoverage: brightOpaquePixels / pixelCount,
		visibleCoverage: visiblePixels / pixelCount
	};
}

test('capacity skills use exact localized game text from locres', () => {
	const capacitySkills = perkSkillData.flatMap((perk) =>
		perk.skillTable.throwable.flatMap((tier) =>
			tier.filter((skill) => /^.+-capacity-tier[24]$/.test(skill.slug))
		)
	);
	assert.equal(capacitySkills.length, 12);

	for (const skill of capacitySkills) {
		assert.equal(skill.name, 'Capacity Increase');
		assert.equal(
			skill.effect.description,
			'Throwable carrying capacity is increased by <sEmp>1</>.'
		);
		assert.equal(formatSkillDescription(skill), 'Throwable carrying capacity is increased by 1.');
		assert.match(
			skill.source?.gameSources?.locresDescriptionKey ?? '',
			/ThrowableCapacity_SkillDescription_/
		);
	}
});

test('local game data marks Capacity Increase as non-upgradeable', () => {
	assert.equal(skillRankCap, 3);
	for (const perk of perkSkillData) {
		for (const tierNumber of [2, 4]) {
			const capacitySkill = perk.skillTable.throwable[tierNumber - 1].find(
				(skill) => skill.internalName === `Capacity_Tier${tierNumber}`
			);
			assert.equal(capacitySkill?.rankCap, 0, `${perk.slug} capacity tier ${tierNumber}`);
		}
	}
});

test('local game curves resolve Insider Trading values for each upgrade rank', () => {
	const insiderTrading = perkSkillData
		.find((perk) => perk.slug === 'commando')
		?.skillTable.passives[0].find((skill) => skill.slug === 'commando-insider-trading');
	assert.deepEqual(insiderTrading?.effect.values, {
		0: [10, 10, 15, 20],
		1: [-10, -10, -15, -20]
	});
	if (!insiderTrading) throw new Error('Expected Insider Trading skill data to load.');
	assert.match(formatSkillDescription(insiderTrading, 0), /increased by \[10\]/);
	assert.match(formatSkillDescription(insiderTrading, 3), /reduced by \[-20%\]/);

	const aBiggerBang = perkSkillData
		.find((perk) => perk.slug === 'commando')
		?.skillTable.throwable[0].find((skill) => skill.slug === 'commando-a-bigger-bang');
	if (!aBiggerBang) throw new Error('Expected A Bigger Bang skill data to load.');
	assert.deepEqual(aBiggerBang.effect.values, { 0: [15, 15, 20, 25] });
	assert.equal(
		formatSkillDescription(aBiggerBang, 0),
		'Grenade explosion radius is increased by [15%].'
	);
});

test('all placed skills have globally unique stable slugs', () => {
	const skillSlugs = perkSkillData.flatMap((perk) =>
		SKILL_CATEGORIES.flatMap((category) =>
			perk.skillTable[category].flatMap((tier) => tier.map((skill) => skill.slug))
		)
	);
	assert.equal(skillSlugs.length, 210);
	assert.equal(new Set(skillSlugs).size, skillSlugs.length);
});

test('level requirements expose the current maximum unlock level', () => {
	assert.deepEqual(levelRequirements.passives, [2, 8, 14, 20, 26]);
	assert.deepEqual(levelRequirements.throwable, [4, 10, 16, 22, 28]);
	assert.deepEqual(levelRequirements.gadget, [6, 12, 18, 24, 30]);
	assert.equal(getMaxSupportedPerkLevel(), 30);
});

test('perk options summarize the selectable perks for the UI', () => {
	assert.deepEqual(
		getPerkOptions().map((perk) => [perk.slug, perk.name, perk.skillCount]),
		[
			['commando', 'Commando', 35],
			['engineer', 'Engineer', 35],
			['firebug', 'Firebug', 35],
			['medic', 'Medic', 35],
			['ninja', 'Ninja', 35],
			['sharpshooter', 'Sharpshooter', 35]
		]
	);
});
