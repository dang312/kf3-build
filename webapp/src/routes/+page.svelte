<script lang="ts">
	import BuildSummaryPanel from '$lib/components/BuildSummaryPanel.svelte';
	import PerkLevelSelector from '$lib/components/PerkLevelSelector.svelte';
	import PerkSelector from '$lib/components/PerkSelector.svelte';
	import SkillDetailPanel from '$lib/components/SkillDetailPanel.svelte';
	import SkillTreeView from '$lib/components/SkillTreeView.svelte';
	import { buildSummaryForState } from '$lib/skills/build-summary';
	import {
		getDefaultPerkSlug,
		getMaxSupportedPerkLevel,
		getPerkBySlug,
		getPerkOptions,
		perkSkillData
	} from '$lib/skills/data';
	import { findFocusedSkill, getDefaultFocusedSkill } from '$lib/skills/focus';
	import {
		getSelectionForSlot,
		isSkillSlotAvailable,
		selectTieredSkill,
		setTieredSkillRank,
		upgradeTieredSkill
	} from '$lib/skills/selection';
	import type {
		PerkSlug,
		SkillOption,
		SkillSelections,
		SkillSlot,
		SkillSlug
	} from '$lib/skills/types';

	const perkOptions = getPerkOptions();
	const maxLevel = getMaxSupportedPerkLevel();

	let selectedPerkSlug = $state<PerkSlug>(getDefaultPerkSlug());
	let perkLevel = $state(maxLevel);
	let skillSelections = $state<SkillSelections>([]);
	let focusedSkillSlug = $state<SkillSlug | undefined>();
	let focusedDetailsOpen = $state(false);
	let expandedDetailsMode = $state(false);
	let shareStatus = $state('');

	let selectedPerk = $derived(getPerkBySlug(selectedPerkSlug) ?? perkSkillData[0]);
	let summary = $derived(
		buildSummaryForState({ perkSlug: selectedPerk.slug, perkLevel, skillSelections }, selectedPerk)
	);
	let focusedSkill = $derived(
		findFocusedSkill(selectedPerk, focusedSkillSlug) ??
			getDefaultFocusedSkill(selectedPerk, perkLevel)
	);
	let focusedSkillSelected = $derived(
		focusedSkill
			? getSelectionForSlot(skillSelections, focusedSkill)?.skillSlug === focusedSkill.skill.slug
			: false
	);
	let focusedSkillAvailable = $derived(
		focusedSkill
			? isSkillSlotAvailable(selectedPerk, skillSelections, focusedSkill, perkLevel)
			: false
	);
	let focusedSkillRank = $derived(
		focusedSkill ? getSelectionForSlot(skillSelections, focusedSkill)?.rank : undefined
	);

	function handlePerkChange(perkSlug: PerkSlug) {
		selectedPerkSlug = perkSlug;
		perkLevel = maxLevel;
		skillSelections = [];
		focusedSkillSlug = undefined;
		focusedDetailsOpen = false;
		shareStatus = '';
	}

	function handleSkillFocus(_slot: SkillSlot, skill: SkillOption) {
		focusedSkillSlug = skill.slug;
	}

	function handleSkillSelect(slot: SkillSlot, skill: SkillOption) {
		focusedSkillSlug = skill.slug;
		skillSelections = selectTieredSkill(selectedPerk, perkLevel, skillSelections, slot, skill.slug);
		focusedDetailsOpen = true;
		shareStatus = '';
	}

	function handleSkillUpgrade(slot: SkillSlot, skill: SkillOption) {
		focusedSkillSlug = skill.slug;
		skillSelections = upgradeTieredSkill(
			selectedPerk,
			perkLevel,
			skillSelections,
			slot,
			skill.slug
		);
		focusedDetailsOpen = true;
		shareStatus = '';
	}

	function handleSkillRefund(slot: SkillSlot, skill: SkillOption) {
		const rank = getSelectionForSlot(skillSelections, slot)?.rank ?? 0;
		focusedSkillSlug = skill.slug;
		skillSelections = setTieredSkillRank(
			selectedPerk,
			perkLevel,
			skillSelections,
			slot,
			skill.slug,
			rank - 1
		);
		shareStatus = '';
	}

	function handleExpandedModeChange(event: Event) {
		expandedDetailsMode = (event.currentTarget as HTMLInputElement).checked;
		if (expandedDetailsMode) focusedDetailsOpen = true;
	}

	async function handleShare() {
		const selectedNames =
			summary.activeSkills.map((entry) => entry.skill.name).join(', ') || 'No skills selected';
		const text = `${summary.perk.name} · Level ${summary.perkLevel}\n${selectedNames}`;

		try {
			if (navigator.share) {
				await navigator.share({ title: `${summary.perk.name} build`, text });
				shareStatus = 'Build summary shared.';
				return;
			}
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(text);
				shareStatus = 'Build summary copied to your clipboard.';
				return;
			}
			shareStatus = 'Native sharing is not available in this browser.';
		} catch {
			shareStatus = 'Sharing was cancelled.';
		}
	}
</script>

<svelte:head>
	<title>KF3 Build Skill Tree Simulator</title>
	<meta
		name="description"
		content="Simulate Killing Floor 3 perk skill trees by selecting a perk, level, and skills."
	/>
</svelte:head>

<div class="simulator-page">
	<section class="control-deck" aria-label="Build controls">
		<PerkSelector perks={perkOptions} {selectedPerkSlug} onChange={handlePerkChange} />
		<PerkLevelSelector {perkLevel} {maxLevel} onChange={(level) => (perkLevel = level)} />
		<label class="mode-toggle">
			<input type="checkbox" checked={expandedDetailsMode} onchange={handleExpandedModeChange} />
			<span>Extended details</span>
		</label>
	</section>

	<div class="workspace">
		<SkillTreeView
			perk={selectedPerk}
			{perkLevel}
			selections={skillSelections}
			{focusedSkillSlug}
			expanded={expandedDetailsMode}
			onFocus={handleSkillFocus}
			onSelect={handleSkillSelect}
			onUpgrade={handleSkillUpgrade}
		/>

		<BuildSummaryPanel
			{summary}
			headingId="build-summary-heading"
			onShare={handleShare}
			{shareStatus}
		/>
	</div>

	<details class="focused-detail" bind:open={focusedDetailsOpen}>
		<summary>
			<span>Focused skill</span>
			<strong>{focusedSkill?.skill.name ?? 'Choose a skill'}</strong>
		</summary>
		<SkillDetailPanel
			{focusedSkill}
			{perkLevel}
			selected={focusedSkillSelected}
			selectedRank={focusedSkillRank}
			selectionAllowed={focusedSkillAvailable}
			headingId="skill-detail-heading"
			onRefund={handleSkillRefund}
		/>
	</details>
</div>

<style>
	.simulator-page {
		display: grid;
		gap: 0.65rem;
		width: 100%;
		min-width: 0;
	}

	.control-deck {
		display: grid;
		min-width: 0;
		grid-template-columns: minmax(13rem, 1fr) minmax(16rem, 22rem) auto;
		gap: 0.4rem;
		border: 1px solid var(--hud-line-bright);
		background: rgb(18 19 23 / 94%);
		padding: 0.4rem;
	}

	.control-deck::before {
		position: absolute;
		width: 0;
		height: 0;
		content: '';
	}

	.mode-toggle {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 3rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-terminal);
		padding: 0 0.75rem;
		color: var(--hud-muted);
		cursor: pointer;
	}

	.mode-toggle:hover,
	.mode-toggle:focus-within {
		border-color: var(--hud-cyan);
		color: var(--hud-cyan-bright);
	}

	.mode-toggle input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--hud-orange);
	}

	.mode-toggle span {
		font-family: var(--font-terminal);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
		gap: 0.65rem;
		align-items: start;
	}

	.focused-detail {
		min-width: 0;
		border: 1px solid var(--hud-line-bright);
		background: var(--hud-surface);
	}

	.focused-detail summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.65rem;
		border-bottom: 1px solid transparent;
		padding: 0 0.75rem;
		cursor: pointer;
	}

	.focused-detail[open] summary {
		border-bottom-color: var(--hud-line);
	}

	.focused-detail summary span,
	.focused-detail summary strong {
		font-family: var(--font-terminal);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.focused-detail summary span {
		color: var(--hud-orange-soft);
		font-size: 0.6rem;
		font-weight: 700;
	}

	.focused-detail summary strong {
		min-width: 0;
		overflow: hidden;
		color: var(--hud-muted);
		font-size: 0.62rem;
		font-weight: 700;
		text-align: right;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.focused-detail :global(.detail-panel) {
		border: 0;
		border-top: 0;
		border-radius: 0;
		box-shadow: none;
	}

	@media (min-width: 1100px) {
		.workspace {
			grid-template-columns: minmax(0, 1fr) 20rem;
		}

		.workspace > :global(.summary-panel) {
			position: sticky;
			top: 0.65rem;
		}
	}

	@media (max-width: 900px) {
		.control-deck {
			grid-template-columns: minmax(11rem, 1fr) minmax(12rem, 1fr);
		}

		.mode-toggle {
			grid-column: 1 / -1;
			justify-content: flex-start;
		}
	}

	@media (max-width: 600px) {
		.control-deck {
			grid-template-columns: 1fr;
			padding: 0.3rem;
		}

		.mode-toggle {
			grid-column: auto;
		}
	}
</style>
