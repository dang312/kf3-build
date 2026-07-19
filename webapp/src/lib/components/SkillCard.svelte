<script lang="ts">
	import { formatDescriptionLines } from '$lib/skills/format';
	import type { SkillOption, SkillRank } from '$lib/skills/types';

	type Props = {
		skill: SkillOption;
		rank?: SkillRank;
		selected?: boolean;
		focused?: boolean;
		locked?: boolean;
		expanded?: boolean;
		onFocus: (skill: SkillOption) => void;
		onSelect: (skill: SkillOption) => void;
		onUpgrade: (skill: SkillOption) => void;
	};

	let {
		skill,
		rank = 0,
		selected = false,
		focused = false,
		locked = false,
		expanded = false,
		onFocus,
		onSelect,
		onUpgrade
	}: Props = $props();
	let descriptionLines = $derived(formatDescriptionLines(skill, rank));
	let iconInitials = $derived(getSkillInitials(skill.name));
	let rankCap = $derived(skill.rankCap ?? 1);
	let upgradeable = $derived(rankCap > 0);
	let maxed = $derived(upgradeable && selected && rank >= rankCap);
	let stateLabel = $derived(
		locked
			? `Locked until level ${skill.unlockLevel ?? '?'}`
			: !upgradeable
				? selected
					? 'Selected. This skill has no upgrade ranks.'
					: 'Unselected. Click to select this skill.'
				: maxed
					? `Selected at maximum rank ${rank} of ${rankCap}`
					: selected
						? `Selected at rank ${rank} of ${rankCap}. Right-click or press Shift+Enter to upgrade.`
						: `Unselected. Click to select at rank 0 of ${rankCap}.`
	);

	function focusSkill() {
		onFocus(skill);
	}

	function handleSelect() {
		focusSkill();
		if (!locked) onSelect(skill);
	}

	function handleUpgrade(event: MouseEvent) {
		event.preventDefault();
		focusSkill();
		if (!locked) onUpgrade(skill);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && event.shiftKey) {
			event.preventDefault();
			focusSkill();
			if (!locked) onUpgrade(skill);
		}
	}

	function getSkillInitials(name: string): string {
		return (
			name
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase())
				.join('') || '?'
		);
	}
</script>

<article
	class="skill-card"
	class:selected
	class:focused
	class:locked
	class:expanded
	class:spent={selected && rank > 0}
	class:maxed
>
	<button
		type="button"
		class="skill-button"
		aria-label={`${skill.name} — ${stateLabel}`}
		aria-pressed={selected}
		aria-disabled={locked}
		onclick={handleSelect}
		oncontextmenu={handleUpgrade}
		onkeydown={handleKeydown}
		onfocus={focusSkill}
		onpointerenter={focusSkill}
	>
		<span class="icon-shell" aria-hidden="true">
			{#if skill.icon}
				<img src={skill.icon} alt="" loading="lazy" />
			{:else}
				<span>{iconInitials}</span>
			{/if}
		</span>
		<span class="skill-name">{skill.name}</span>
		{#if upgradeable}
			<span class="rank-meter" aria-hidden="true" style:--rank-cap={rankCap}>
				{#each Array.from({ length: rankCap }).keys() as index (index)}
					<i class:filled={index < rank}></i>
				{/each}
				<b>{rank}/{rankCap}</b>
			</span>
		{/if}
	</button>

	{#if expanded}
		<div class="expanded-details">
			{#if descriptionLines.length > 0}
				{#each descriptionLines as line, index (`${index}-${line}`)}
					<p>{line}</p>
				{/each}
			{:else}
				<p>Effect text pending source review.</p>
			{/if}
		</div>
	{/if}
</article>

<style>
	.skill-card {
		position: relative;
		display: grid;
		gap: 0.4rem;
		min-width: 0;
	}

	.skill-button {
		display: grid;
		grid-template-rows: minmax(0, 1fr) minmax(1.7rem, auto) auto;
		justify-items: center;
		gap: 0.3rem;
		width: 100%;
		min-height: 7rem;
		border: 1px solid var(--line);
		background: var(--surface-1);
		color: var(--ink);
		padding: 0.45rem 0.3rem 0;
		cursor: pointer;
	}

	.skill-button:hover,
	.skill-button:focus-visible,
	.focused .skill-button {
		border-color: var(--line-strong);
		background: var(--surface-2);
	}

	.selected .skill-button {
		border-color: var(--accent);
		background: oklch(24% 0.035 60);
		box-shadow: inset 0 0 0 1px oklch(72% 0.17 65 / 32%);
	}

	.maxed .skill-button {
		border-color: oklch(77% 0.15 145);
		background: oklch(24% 0.04 145);
		box-shadow: inset 0 0 0 1px oklch(77% 0.15 145 / 34%);
	}

	.locked .skill-button {
		color: var(--quiet);
		cursor: not-allowed;
	}

	.rank-meter {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(var(--rank-cap), 0.48rem) minmax(0, 1fr);
		align-items: center;
		gap: 0.14rem;
		width: calc(100% + 0.6rem);
		min-height: 1.5rem;
		margin: 0 -0.3rem;
		padding: 0.3rem 0.35rem;
		border-top: 1px solid var(--line-strong);
		background: var(--surface-0);
	}

	.rank-meter i {
		display: block;
		height: 0.38rem;
		border: 1px solid var(--line-strong);
		background: var(--surface-1);
	}

	.spent .rank-meter i.filled {
		border-color: oklch(74% 0.13 220);
		background: oklch(64% 0.12 220);
	}

	.rank-meter b {
		min-width: 0;
		color: var(--muted);
		font-family: var(--font-terminal);
		font-size: 0.55rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		text-align: right;
	}

	.spent .rank-meter b {
		color: oklch(86% 0.08 220);
	}

	.maxed .rank-meter i.filled {
		border-color: oklch(77% 0.15 145);
		background: oklch(67% 0.14 145);
	}

	.maxed .rank-meter b {
		color: oklch(88% 0.1 145);
	}

	.icon-shell {
		display: grid;
		place-items: center;
		width: min(100%, 4rem);
		aspect-ratio: 1;
		border: 1px solid var(--line-strong);
		background: var(--surface-0);
		overflow: hidden;
	}

	.icon-shell img {
		width: 82%;
		height: 82%;
		object-fit: contain;
	}

	.icon-shell span {
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 1rem;
		font-weight: 700;
	}

	.selected .icon-shell {
		border-color: var(--accent);
	}

	.maxed .icon-shell {
		border-color: oklch(77% 0.15 145);
	}

	.locked .icon-shell {
		filter: grayscale(1);
		opacity: 0.55;
	}

	.skill-name {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		font-family: var(--font-terminal);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1.25;
		text-transform: uppercase;
	}

	.expanded-details {
		border: 1px solid var(--line);
		background: var(--surface-0);
		padding: 0.6rem;
	}

	.expanded-details p {
		margin: 0;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.45;
	}
</style>
