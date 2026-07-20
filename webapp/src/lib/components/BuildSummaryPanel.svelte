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
		<p>Live data feed / Build Summary</p>
		<h2 id={headingId}>{summary.perk.name}</h2>
		<span>Operator {summary.perk.character} · Level {summary.perkLevel}</span>
	</header>

	<section class="selected-skills" aria-labelledby={`${headingId}-selected`}>
		<div class="section-label">
			<h3 id={`${headingId}-selected`}>Selected Effects</h3>
			<span>{summary.activeSkillCount} active</span>
		</div>
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
								>{formatCategoryLabel(entry.category)} · T{entry.tierNumber}{#if (entry.skill.rankCap ?? 1) > 0}
									· Rank {entry.rank}/{entry.skill.rankCap ?? 1}{entry.rank === 0
										? ' · Base effect'
										: ''}{:else}
									· Fixed effect{/if}</span
							>
							{#if !compact}<p>{entry.description}</p>{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">Select an available skill module to populate telemetry.</p>
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
			<h3 id={`${headingId}-warnings`}>Verification warnings</h3>
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
		gap: 0.65rem;
		border: 1px solid var(--hud-line-bright);
		border-top: 2px solid var(--hud-orange);
		background: rgb(26 28 31 / 96%);
		padding: 0.65rem;
	}

	.summary-heading {
		display: grid;
		gap: 0.14rem;
		border-bottom: 1px solid var(--hud-line);
		padding-bottom: 0.6rem;
	}

	.summary-heading p,
	.summary-heading h2,
	.summary-heading > span {
		margin: 0;
	}

	.summary-heading p,
	h3,
	.section-label > span {
		color: var(--hud-orange-soft);
		font-family: var(--font-terminal);
		font-size: 0.54rem;
		font-weight: 700;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.summary-heading h2 {
		color: var(--hud-cyan-bright);
		font-family: var(--font-terminal);
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.summary-heading > span {
		color: var(--hud-muted);
		font-size: 0.64rem;
		font-weight: 650;
		text-transform: uppercase;
	}

	section {
		display: grid;
		gap: 0.4rem;
	}

	h3,
	p,
	ul {
		margin: 0;
	}

	.section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.section-label > span {
		color: var(--hud-cyan);
		font-size: 0.47rem;
	}

	ul {
		display: grid;
		gap: 0;
		padding: 0;
		list-style: none;
	}

	.selected-skills li {
		display: grid;
		grid-template-columns: 1.8rem minmax(0, 1fr);
		gap: 0.4rem;
		align-items: start;
		border-bottom: 1px solid rgb(58 73 75 / 70%);
		padding: 0.38rem 0;
	}

	.skill-icon {
		display: grid;
		place-items: center;
		width: 1.7rem;
		aspect-ratio: 1;
		border: 1px solid var(--hud-cyan);
		background: var(--hud-bg);
		color: var(--hud-cyan);
		font-family: var(--font-terminal);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.skill-icon img {
		width: 80%;
		height: 80%;
		object-fit: contain;
	}

	.selected-skills strong,
	.selected-skills div > span,
	.selected-skills p {
		display: block;
	}

	.selected-skills strong {
		color: var(--hud-ink);
		font-family: var(--font-terminal);
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		line-height: 1.25;
		text-transform: uppercase;
	}

	.selected-skills div > span {
		margin-top: 0.1rem;
		color: var(--hud-cyan);
		font-size: 0.49rem;
		font-weight: 650;
		text-transform: uppercase;
	}

	.selected-skills p {
		margin-top: 0.18rem;
		color: var(--hud-muted);
		font-size: 0.62rem;
		line-height: 1.3;
	}

	.summary-meta {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.3rem;
	}

	.summary-meta div {
		display: grid;
		gap: 0.12rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-bg);
		padding: 0.45rem;
	}

	.summary-meta span,
	.summary-meta small {
		color: var(--hud-muted);
		font-family: var(--font-terminal);
		font-size: 0.46rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.summary-meta strong {
		color: var(--hud-orange-soft);
		font-family: var(--font-terminal);
		font-size: 0.76rem;
		font-weight: 700;
	}

	.summary-meta small {
		color: var(--hud-warning);
		line-height: 1.25;
	}

	.warnings,
	.locked-skills {
		border: 1px solid rgb(220 164 0 / 65%);
		background: rgb(220 164 0 / 7%);
		padding: 0.45rem;
	}

	.locked-skills {
		border-color: rgb(232 89 77 / 65%);
		background: rgb(232 89 77 / 7%);
	}

	.warnings h3,
	.locked-skills h3 {
		color: var(--hud-warning);
	}

	.locked-skills h3 {
		color: var(--hud-danger);
	}

	.warnings li,
	.locked-skills li,
	.empty {
		color: var(--hud-muted);
		font-size: 0.62rem;
		line-height: 1.35;
	}

	.share-build {
		min-height: 2.8rem;
		border: 1px solid var(--hud-orange);
		background: var(--hud-orange);
		color: var(--hud-terminal);
		font-family: var(--font-terminal);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.share-build:hover,
	.share-build:focus-visible {
		background: var(--hud-orange-soft);
		box-shadow: 0 0 8px rgb(255 138 0 / 42%);
	}

	.share-status {
		color: var(--hud-green);
		font-size: 0.62rem;
		text-align: center;
	}

	@media (max-width: 680px) {
		.summary-panel {
			position: static;
		}
	}
</style>
