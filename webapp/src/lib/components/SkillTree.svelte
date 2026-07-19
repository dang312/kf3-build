<script lang="ts">
	import { formatCategoryLabel } from '$lib/skills/format';
	import {
		getSelectionForSlot,
		getSkillSlotUnlockLevel,
		isSkillSlotAvailable
	} from '$lib/skills/selection';
	import type {
		PerkLevel,
		PerkSkillData,
		SkillCategory,
		SkillOption,
		SkillSelections,
		SkillSlot,
		SkillSlug
	} from '$lib/skills/types';
	import SkillTier from './SkillTier.svelte';

	type Props = {
		perk: PerkSkillData;
		category: SkillCategory;
		perkLevel: PerkLevel;
		selections: SkillSelections;
		focusedSkillSlug?: SkillSlug;
		expanded?: boolean;
		onFocus: (slot: SkillSlot, skill: SkillOption) => void;
		onSelect: (slot: SkillSlot, skill: SkillOption) => void;
		onUpgrade: (slot: SkillSlot, skill: SkillOption) => void;
	};

	let {
		perk,
		category,
		perkLevel,
		selections,
		focusedSkillSlug,
		expanded = false,
		onFocus,
		onSelect,
		onUpgrade
	}: Props = $props();
	let tiers = $derived(perk.skillTable[category]);
	let categoryLabel = $derived(formatCategoryLabel(category));

	function selection(tierNumber: number) {
		return getSelectionForSlot(selections, { category, tierNumber });
	}

	function unlockLevel(tierNumber: number) {
		return getSkillSlotUnlockLevel(perk, { category, tierNumber });
	}

	function tierAvailable(tierNumber: number) {
		return isSkillSlotAvailable(perk, selections, { category, tierNumber }, perkLevel);
	}
</script>

<section class="skill-tree" aria-labelledby={`${category}-heading`}>
	<h2 id={`${category}-heading`}>{categoryLabel}</h2>
	<div class="tiers">
		{#each tiers as tier, tierIndex (tierIndex)}
			<SkillTier
				{category}
				tierNumber={tierIndex + 1}
				unlockLevel={unlockLevel(tierIndex + 1)}
				available={tierAvailable(tierIndex + 1)}
				{perkLevel}
				skills={tier}
				selectedSkillSlug={selection(tierIndex + 1)?.skillSlug}
				selectedRank={selection(tierIndex + 1)?.rank}
				{focusedSkillSlug}
				{expanded}
				{onFocus}
				{onSelect}
				{onUpgrade}
			/>
		{/each}
	</div>
</section>

<style>
	.skill-tree {
		display: grid;
		align-content: start;
		gap: 0.7rem;
		min-width: 15rem;
		border: 1px solid var(--line);
		background: var(--surface-1);
		padding: 0.7rem;
	}

	h2 {
		margin: 0;
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		line-height: 1.1;
		padding: 0.25rem 0.25rem 0.7rem;
		text-align: center;
		text-transform: uppercase;
	}

	.tiers {
		display: grid;
		gap: 0.55rem;
	}
</style>
