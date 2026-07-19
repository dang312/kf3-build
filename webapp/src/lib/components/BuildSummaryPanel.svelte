<script lang="ts">
	import { formatCategoryLabel } from '$lib/skills/format';
	import type { BuildSummary } from '$lib/skills/types';

	type Props = {
		summary: BuildSummary;
		compact?: boolean;
		headingId?: string;
		onShare?: () => void;
		shareStatus?: string;
	};

	let {
		summary,
		compact = false,
		headingId = 'build-summary-heading',
		onShare,
		shareStatus
	}: Props = $props();
</script>

<aside class="summary-panel" class:compact aria-labelledby={headingId}>
	<header class="summary-heading">
		<p>Build Summary</p>
		<h2 id={headingId}>{summary.perk.name}</h2>
		<span>{summary.perk.character} · Level {summary.perkLevel}</span>
	</header>

	<section class="selected-skills" aria-labelledby={`${headingId}-selected`}>
		<h3 id={`${headingId}-selected`}>Selected Effects</h3>
		{#if summary.activeSkills.length > 0}
			<ul>
				{#each summary.activeSkills as entry (`${entry.category}-${entry.tierNumber}-${entry.skill.slug}`)}
					<li>
						<span class="skill-icon" aria-hidden="true">
							{#if entry.skill.icon}
								<img src={entry.skill.icon} alt="" loading="lazy" />
							{:else}
								<span>{entry.skill.name.slice(0, 1)}</span>
							{/if}
						</span>
						<div>
							<strong>{entry.skill.name}</strong>
							<span
								>{formatCategoryLabel(entry.category)} · Tier {entry.tierNumber}{#if (entry.skill.rankCap ?? 1) > 0}
									· Rank {entry.rank}/{entry.skill.rankCap ?? 1}{entry.rank === 0
										? ' · Base effect · 0 points spent'
										: ''}{:else}
									· Fixed effect{/if}</span
							>
							{#if !compact}<p>{entry.description}</p>{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">Choose one available skill in a tier to add it here.</p>
		{/if}
	</section>

	<section class="summary-meta" aria-label="Build summary data">
		<div>
			<span>Active selections</span>
			<strong>{summary.activeSkillCount} / {summary.unlockedSlotCount}</strong>
		</div>
		<div>
			<span>Starting money</span>
			<strong
				>{summary.operationalBudget === undefined ? 'Pending' : summary.operationalBudget}</strong
			>
			<small>{summary.operationalBudgetStatus}</small>
		</div>
	</section>

	{#if summary.warnings.length > 0}
		<section class="warnings" aria-labelledby={`${headingId}-warnings`}>
			<h3 id={`${headingId}-warnings`}>Warnings</h3>
			<ul>
				{#each summary.warnings as warning, index (`${index}-${warning}`)}
					<li>{warning}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if summary.lockedSkills.length > 0}
		<section class="locked-skills" aria-labelledby={`${headingId}-locked`}>
			<h3 id={`${headingId}-locked`}>Locked selections</h3>
			<ul>
				{#each summary.lockedSkills as entry (`${entry.category}-${entry.tierNumber}-${entry.skill.slug}`)}
					<li>{entry.skill.name} — unlocks at level {entry.unlockLevel}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if onShare}
		<button type="button" class="share-build" onclick={onShare}>Share Build</button>
		{#if shareStatus}<p class="share-status" aria-live="polite">{shareStatus}</p>{/if}
	{/if}
</aside>

<style>
	.summary-panel {
		display: grid;
		align-content: start;
		gap: 0.9rem;
		border: 1px solid var(--line-strong);
		background: var(--surface-1);
		padding: 0.85rem;
	}

	.summary-heading {
		display: grid;
		gap: 0.15rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.75rem;
	}

	.summary-heading p,
	.summary-heading h2 {
		margin: 0;
	}

	.summary-heading p,
	h3 {
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.summary-heading h2 {
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.summary-heading > span {
		color: var(--muted);
		font-size: 0.74rem;
		font-weight: 650;
	}

	section {
		display: grid;
		gap: 0.5rem;
	}

	h3,
	p,
	ul {
		margin: 0;
	}

	ul {
		display: grid;
		gap: 0.45rem;
		padding: 0;
		list-style: none;
	}

	.selected-skills li {
		display: grid;
		grid-template-columns: 2.35rem minmax(0, 1fr);
		gap: 0.55rem;
		align-items: start;
		border-bottom: 1px solid var(--line);
		padding: 0 0 0.5rem;
	}

	.skill-icon {
		display: grid;
		place-items: center;
		width: 2.2rem;
		aspect-ratio: 1;
		border: 1px solid var(--accent);
		background: var(--surface-0);
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.skill-icon img {
		width: 80%;
		height: 80%;
		object-fit: contain;
	}

	.selected-skills strong,
	.selected-skills span,
	.selected-skills p {
		display: block;
	}

	.selected-skills strong {
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		line-height: 1.25;
		text-transform: uppercase;
	}

	.selected-skills div > span {
		margin-top: 0.1rem;
		color: var(--quiet);
		font-size: 0.64rem;
		font-weight: 650;
		text-transform: uppercase;
	}

	.selected-skills p {
		margin-top: 0.2rem;
		color: var(--muted);
		font-size: 0.72rem;
		line-height: 1.35;
	}

	.summary-meta {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.45rem;
	}

	.summary-meta div {
		display: grid;
		gap: 0.15rem;
		border: 1px solid var(--line);
		background: var(--surface-0);
		padding: 0.55rem;
	}

	.summary-meta span,
	.summary-meta small {
		color: var(--muted);
		font-family: var(--font-terminal);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.summary-meta strong {
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 0.9rem;
		font-weight: 700;
	}

	.summary-meta small {
		line-height: 1.25;
	}

	.warnings,
	.locked-skills {
		border: 1px solid var(--line);
		background: var(--surface-0);
		padding: 0.6rem;
	}

	.warnings h3,
	.locked-skills h3 {
		color: var(--warning);
	}

	.warnings li,
	.locked-skills li,
	.empty {
		color: var(--muted);
		font-size: 0.76rem;
		line-height: 1.4;
	}

	.share-build {
		min-height: 3.2rem;
		border: 1px solid var(--action);
		background: var(--action);
		color: var(--surface-0);
		font-family: var(--font-terminal);
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.share-build:hover,
	.share-build:focus-visible {
		background: var(--action-strong);
	}

	.share-status {
		color: var(--muted);
		font-size: 0.72rem;
		text-align: center;
	}
</style>
