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
		width: 100%;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		border: 1px solid var(--hud-line);
		background: rgb(11 9 6 / 72%);
		padding: 0.35rem;
	}

	.tree-columns {
		display: grid;
		width: 100%;
		min-width: 0;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
		min-width: 0;
	}

	.tree-columns :global(.skill-tree) {
		min-width: 0;
	}

	@media (max-width: 1040px) {
		.tree-columns {
			grid-template-columns: repeat(3, minmax(15.5rem, 1fr));
			overflow-x: auto;
			padding-bottom: 0.35rem;
			scroll-snap-type: x proximity;
		}

		.tree-columns :global(.skill-tree) {
			scroll-snap-align: start;
		}
	}

	@media (max-width: 680px) {
		.skill-tree-view {
			padding: 0.25rem;
		}

		.tree-columns {
			grid-template-columns: minmax(0, 1fr);
			overflow: visible;
		}
	}
</style>
