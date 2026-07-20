<script lang="ts">
	import SkillCard from './SkillCard.svelte';
	import type {
		PerkLevel,
		SkillCategory,
		SkillOption,
		SkillRank,
		SkillSlot,
		SkillSlug,
		SkillTierNumber
	} from '$lib/skills/types';

	type Props = {
		category: SkillCategory;
		tierNumber: SkillTierNumber;
		unlockLevel?: PerkLevel;
		available: boolean;
		perkLevel: PerkLevel;
		skills: SkillOption[];
		selectedSkillSlug?: SkillSlug;
		selectedRank?: SkillRank;
		focusedSkillSlug?: SkillSlug;
		expanded?: boolean;
		onFocus: (slot: SkillSlot, skill: SkillOption) => void;
		onSelect: (slot: SkillSlot, skill: SkillOption) => void;
		onUpgrade: (slot: SkillSlot, skill: SkillOption) => void;
	};

	let {
		category,
		tierNumber,
		unlockLevel,
		available,
		perkLevel,
		skills,
		selectedSkillSlug,
		selectedRank,
		focusedSkillSlug,
		expanded = false,
		onFocus,
		onSelect,
		onUpgrade
	}: Props = $props();
	let locked = $derived(!available);
	let lockLabel = $derived(
		unlockLevel === undefined || perkLevel < unlockLevel
			? `Lv. ${unlockLevel ?? '?'} locked`
			: 'Select earlier tiers'
	);

	function selectSkill(skill: SkillOption) {
		onSelect({ category, tierNumber }, skill);
	}

	function focusSkill(skill: SkillOption) {
		onFocus({ category, tierNumber }, skill);
	}

	function upgradeSkill(skill: SkillOption) {
		onUpgrade({ category, tierNumber }, skill);
	}
</script>

<section
	class="skill-tier"
	class:locked
	class:expanded
	aria-labelledby={`${category}-tier-${tierNumber}`}
>
	<header>
		<h3 id={`${category}-tier-${tierNumber}`}>Tier {tierNumber}</h3>
		<span>{locked ? lockLabel : `Lv. ${unlockLevel ?? '?'} unlocked`}</span>
	</header>
	<div
		class="skill-options"
		class:singleOption={skills.length === 1}
		class:threeOptions={skills.length === 3}
	>
		{#each skills as skill (skill.slug)}
			<SkillCard
				{skill}
				rank={selectedSkillSlug === skill.slug ? (selectedRank ?? 0) : 0}
				selected={selectedSkillSlug === skill.slug}
				focused={focusedSkillSlug === skill.slug}
				{locked}
				{expanded}
				onFocus={focusSkill}
				onSelect={selectSkill}
				onUpgrade={upgradeSkill}
			/>
		{/each}
	</div>
</section>

<style>
	.skill-tier {
		display: grid;
		grid-template-columns: 2.85rem minmax(0, 1fr);
		gap: 0.3rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-terminal);
		padding: 0.25rem;
	}

	.skill-tier.locked {
		border-color: rgb(132 148 149 / 55%);
	}

	header {
		display: grid;
		min-width: 0;
		align-content: center;
		gap: 0.15rem;
		border-right: 1px solid var(--hud-line);
		padding-right: 0.3rem;
	}

	h3,
	header span {
		margin: 0;
		font-family: var(--font-terminal);
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	h3 {
		color: var(--hud-ink);
		font-size: 0.6rem;
		line-height: 1.15;
	}

	header span {
		color: var(--hud-muted);
		font-size: 0.45rem;
		line-height: 1.25;
	}

	.skill-tier.locked header h3,
	.skill-tier.locked header span {
		color: var(--hud-quiet);
	}

	.skill-options {
		display: grid;
		width: 100%;
		min-width: 0;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.25rem;
	}

	.skill-options.singleOption,
	.expanded .skill-options {
		grid-template-columns: minmax(0, 1fr);
	}

	.skill-options.threeOptions {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 420px) {
		.skill-tier {
			grid-template-columns: 2.5rem minmax(0, 1fr);
		}

		.skill-options,
		.skill-options.threeOptions {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
