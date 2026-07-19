<script lang="ts">
	import {
		SKILL_CATEGORIES,
		type PerkLevel,
		type PerkSkillData,
		type SkillOption,
		type SkillSelections,
		type SkillSlot,
		type SkillSlug
	} from '$lib/skills/types';
	import SkillTree from './SkillTree.svelte';

	type Props = {
		perk: PerkSkillData;
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
		perkLevel,
		selections,
		focusedSkillSlug,
		expanded = false,
		onFocus,
		onSelect,
		onUpgrade
	}: Props = $props();
</script>

<section class="skill-tree-view" aria-label={`${perk.name} skill trees`}>
	<div class="tree-columns">
		{#each SKILL_CATEGORIES as category (category)}
			<SkillTree
				{perk}
				{category}
				{perkLevel}
				{selections}
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
	.skill-tree-view {
		min-width: 0;
	}

	.tree-columns {
		display: grid;
		grid-template-columns: repeat(3, minmax(15rem, 1fr));
		gap: 0.75rem;
		min-width: 0;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		scroll-snap-type: x proximity;
	}

	.tree-columns :global(.skill-tree) {
		scroll-snap-align: start;
	}

	@media (max-width: 900px) {
		.tree-columns {
			grid-template-columns: repeat(3, minmax(16rem, 82vw));
		}
	}
</style>
