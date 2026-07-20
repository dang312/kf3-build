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
		gap: 0.35rem;
		width: 100%;
		min-width: 0;
		border: 1px solid var(--hud-line);
		background: var(--hud-surface);
		padding: 0.35rem;
	}

	h2 {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.1rem;
		margin: 0;
		border-bottom: 1px solid var(--hud-line-bright);
		color: var(--hud-cyan);
		font-family: var(--font-terminal);
		font-size: clamp(0.72rem, 1.2vw, 0.95rem);
		font-weight: 700;
		letter-spacing: 0.14em;
		line-height: 1.1;
		padding: 0.15rem 0.25rem 0.35rem;
		text-align: center;
		text-shadow: 0 0 8px rgb(0 219 231 / 45%);
		text-transform: uppercase;
	}

	.tiers {
		display: grid;
		gap: 0.3rem;
	}
</style>
