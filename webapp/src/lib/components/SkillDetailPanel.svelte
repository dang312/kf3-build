<script lang="ts">
	import { formatCategoryLabel, formatDescriptionLines } from '$lib/skills/format';
	import { isFocusedSkillLocked, type FocusedSkill } from '$lib/skills/focus';
	import type { PerkLevel, SkillOption, SkillRank, SkillSlot } from '$lib/skills/types';

	type Props = {
		focusedSkill?: FocusedSkill;
		perkLevel: PerkLevel;
		selected?: boolean;
		selectedRank?: SkillRank;
		selectionAllowed?: boolean;
		headingId?: string;
		onRefund?: (slot: SkillSlot, skill: SkillOption) => void;
	};

	let {
		focusedSkill,
		perkLevel,
		selected = false,
		selectedRank,
		selectionAllowed = true,
		headingId = 'skill-detail-heading',
		onRefund
	}: Props = $props();
	let levelLocked = $derived(focusedSkill ? isFocusedSkillLocked(focusedSkill, perkLevel) : false);
	let locked = $derived(levelLocked || !selectionAllowed);
	let descriptionLines = $derived(
		focusedSkill ? formatDescriptionLines(focusedSkill.skill, selectedRank ?? 0) : []
	);
	let source = $derived(focusedSkill?.skill.source);
	let iconInitials = $derived(getSkillInitials(focusedSkill?.skill.name));
	let rankCap = $derived(focusedSkill?.skill.rankCap ?? 1);
	let upgradeable = $derived(rankCap > 0);
	let stateLabel = $derived(locked ? 'Locked' : selected ? 'Selected' : 'Available');

	function handleRefund() {
		if (!focusedSkill || !selected || !selectedRank) return;
		onRefund?.(
			{ category: focusedSkill.category, tierNumber: focusedSkill.tierNumber },
			focusedSkill.skill
		);
	}

	function getSkillInitials(name: string | undefined): string {
		return name
			? name
					.split(/\s+/)
					.filter(Boolean)
					.slice(0, 2)
					.map((part) => part[0]?.toUpperCase())
					.join('') || '?'
			: '?';
	}
</script>

<aside class="detail-panel" aria-labelledby={headingId}>
	{#if focusedSkill}
		<header class="detail-heading">
			<span class="skill-icon" aria-hidden="true">
				{#if focusedSkill.skill.icon}
					<img src={focusedSkill.skill.icon} alt="" loading="lazy" />
				{:else}
					<span>{iconInitials}</span>
				{/if}
			</span>
			<div>
				<p>Skill detail</p>
				<h2 id={headingId}>{focusedSkill.skill.name}</h2>
				<span class="meta"
					>{formatCategoryLabel(focusedSkill.category)} · Tier {focusedSkill.tierNumber} · Unlock level
					{focusedSkill.skill.unlockLevel ?? focusedSkill.unlockLevel ?? '?'}</span
				>
			</div>
		</header>

		<div class="state-row">
			<span class="state" class:locked class:selected>{stateLabel}</span>
			<span
				>{levelLocked
					? `Visible for planning at level ${perkLevel}.`
					: !selectionAllowed
						? 'Select every earlier tier in this tree first.'
						: !upgradeable
							? selected
								? 'This skill has no upgrade ranks.'
								: 'Click this skill card to equip it.'
							: selected
								? (selectedRank ?? 0) === 0
									? `Rank 0 / ${rankCap}. No points spent; right-click this skill card to upgrade.`
									: `Rank ${selectedRank} / ${rankCap}. Right-click this skill card to upgrade.`
								: 'Click this skill card to select it at rank 0.'}</span
			>
		</div>

		{#if selected && upgradeable}
			<button type="button" class="refund-action" disabled={!selectedRank} onclick={handleRefund}>
				{selectedRank ? 'Refund 1 point' : 'No points spent'}
			</button>
		{/if}

		<section class="description" aria-labelledby={`${headingId}-description`}>
			<h3 id={`${headingId}-description`}>Effect</h3>
			{#if descriptionLines.length > 0}
				{#each descriptionLines as line, index (`${index}-${line}`)}
					<p>{line}</p>
				{/each}
			{:else}
				<p>Effect text pending source review.</p>
			{/if}
		</section>

		{#if source}
			<details class="source-details">
				<summary>Source details</summary>
				<dl>
					<div>
						<dt>Skill data</dt>
						<dd>{source.collectionStatus}</dd>
					</div>
					{#if source.gameSources?.iconAsset}
						<div>
							<dt>Icon asset</dt>
							<dd>{source.gameSources.iconAsset}</dd>
						</div>
					{/if}
					{#if source.gameSources?.locresDescriptionKey}
						<div>
							<dt>Locres description</dt>
							<dd>{source.gameSources.locresDescriptionKey}</dd>
						</div>
					{/if}
				</dl>
			</details>
		{/if}
	{:else}
		<div class="empty-state">
			<p>Skill detail</p>
			<h2 id={headingId}>No skill focused</h2>
			<span>Focus a skill node to inspect its effect and source details.</span>
		</div>
	{/if}
</aside>

<style>
	.detail-panel {
		display: grid;
		gap: 0.85rem;
		background: var(--surface-1);
		padding: 0.85rem;
	}

	.detail-heading {
		display: grid;
		grid-template-columns: 4.2rem minmax(0, 1fr);
		gap: 0.7rem;
		align-items: center;
	}

	.skill-icon {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border: 1px solid var(--line-strong);
		background: var(--surface-0);
		color: var(--accent);
		font-family: var(--font-terminal);
		font-weight: 700;
	}

	.skill-icon img {
		width: 80%;
		height: 80%;
		object-fit: contain;
	}

	.detail-heading div,
	.empty-state {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}

	.detail-heading p,
	.empty-state p,
	h2,
	h3,
	p {
		margin: 0;
	}

	.detail-heading p,
	.empty-state p,
	h3 {
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h2 {
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.meta,
	.state-row > span:last-child,
	.empty-state > span {
		color: var(--muted);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.state-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.state {
		border: 1px solid var(--line-strong);
		color: var(--muted);
		padding: 0.2rem 0.4rem;
		font-family: var(--font-terminal);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.state.selected {
		border-color: var(--accent);
		color: var(--accent);
	}

	.state.locked {
		border-color: var(--danger);
		color: var(--danger);
	}

	.refund-action,
	.description,
	.source-details {
		border: 1px solid var(--line);
		background: var(--surface-0);
	}

	.refund-action {
		min-height: 2.5rem;
		border: 1px solid var(--line-strong);
		background: var(--surface-0);
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.refund-action:hover:not(:disabled),
	.refund-action:focus-visible:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.refund-action:disabled {
		color: var(--quiet);
		cursor: not-allowed;
	}

	.description {
		display: grid;
		gap: 0.45rem;
		padding: 0.7rem;
	}

	.description p {
		color: var(--muted);
		font-size: 0.86rem;
		line-height: 1.5;
	}

	.source-details {
		color: var(--muted);
		font-size: 0.76rem;
		padding: 0.65rem 0.7rem;
	}

	.source-details summary {
		cursor: pointer;
		font-family: var(--font-terminal);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	dl {
		display: grid;
		gap: 0.5rem;
		margin: 0.65rem 0 0;
	}

	dt {
		color: var(--ink);
		font-weight: 700;
	}

	dd {
		margin: 0.1rem 0 0;
		overflow-wrap: anywhere;
	}
</style>
