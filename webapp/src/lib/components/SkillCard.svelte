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
		<span class="card-topline">
			<span class="icon-shell" aria-hidden="true">
				{#if skill.icon}
					<img src={skill.icon} alt="" loading="lazy" />
				{:else}
					<span>{iconInitials}</span>
				{/if}
			</span>
			<span class="state-mark" aria-hidden="true"
				>{locked ? 'LOCKED' : maxed ? 'MAX' : selected ? 'ACTIVE' : 'READY'}</span
			>
		</span>
		<span class="skill-name">{skill.name}</span>
		{#if locked}
			<span class="lock-reason"
				>{skill.unlockLevel ? `UNLOCK LV ${skill.unlockLevel}` : 'PREREQUISITE'}</span
			>
		{/if}
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
		gap: 0.22rem;
		min-width: 0;
	}

	.skill-button {
		display: grid;
		min-width: 0;
		grid-template-rows: auto minmax(1.45rem, auto) auto auto;
		justify-items: center;
		gap: 0.22rem;
		width: 100%;
		min-height: 5.95rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-panel);
		color: var(--hud-ink);
		padding: 0.28rem 0.22rem 0;
		cursor: pointer;
	}

	.skill-button:hover,
	.skill-button:focus-visible,
	.focused .skill-button {
		border-color: var(--hud-cyan);
		background: #202428;
		box-shadow: inset 0 0 8px rgb(0 219 231 / 12%);
	}

	.selected .skill-button {
		border-color: var(--hud-orange);
		background: rgb(255 138 0 / 7%);
		box-shadow:
			inset 0 0 0 1px rgb(255 138 0 / 35%),
			0 0 5px rgb(255 138 0 / 22%);
	}

	.maxed .skill-button {
		border-color: var(--hud-green);
		background: rgb(113 205 118 / 7%);
		box-shadow: inset 0 0 0 1px rgb(113 205 118 / 32%);
	}

	.locked .skill-button {
		color: var(--hud-quiet);
		cursor: not-allowed;
	}

	.rank-meter {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(var(--rank-cap), minmax(0, 1fr)) auto;
		align-items: center;
		gap: 0.12rem;
		width: calc(100% + 0.44rem);
		min-height: 1.08rem;
		margin: 0 -0.22rem;
		padding: 0.2rem 0.25rem;
		border-top: 1px solid var(--hud-line);
		background: var(--hud-terminal);
	}

	.rank-meter i {
		display: block;
		height: 0.3rem;
		border: 1px solid var(--hud-line-bright);
		background: var(--hud-panel);
	}

	.spent .rank-meter i.filled {
		border-color: var(--hud-cyan);
		background: var(--hud-cyan);
		box-shadow: 0 0 4px rgb(0 219 231 / 65%);
	}

	.rank-meter b {
		min-width: 1.35rem;
		color: var(--hud-muted);
		font-family: var(--font-terminal);
		font-size: 0.43rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		text-align: right;
	}

	.spent .rank-meter b {
		color: var(--hud-cyan-bright);
	}

	.maxed .rank-meter i.filled {
		border-color: var(--hud-green);
		background: var(--hud-green);
		box-shadow: 0 0 4px rgb(113 205 118 / 55%);
	}

	.maxed .rank-meter b {
		color: var(--hud-green);
	}

	.icon-shell {
		display: grid;
		place-items: center;
		width: min(100%, 2.35rem);
		aspect-ratio: 1;
		border: 1px solid var(--hud-line-bright);
		background: var(--hud-bg);
		overflow: hidden;
	}

	.icon-shell img {
		width: 84%;
		height: 84%;
		filter: grayscale(1) brightness(1.55);
		object-fit: contain;
	}

	.selected .icon-shell img {
		filter: sepia(1) saturate(8) hue-rotate(335deg) brightness(1.2);
	}

	.spent .icon-shell img {
		filter: none;
	}

	.maxed .icon-shell img {
		filter: sepia(1) saturate(5) hue-rotate(65deg) brightness(1.05);
	}

	.locked .icon-shell img {
		filter: grayscale(1) brightness(0.7);
	}

	.icon-shell span {
		color: var(--hud-cyan);
		font-family: var(--font-terminal);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.selected .icon-shell {
		border-color: var(--hud-orange);
		box-shadow: 0 0 6px rgb(255 138 0 / 38%);
	}

	.spent .icon-shell {
		border-color: var(--hud-cyan);
		box-shadow: 0 0 6px rgb(0 219 231 / 38%);
	}

	.maxed .icon-shell {
		border-color: var(--hud-green);
		box-shadow: 0 0 6px rgb(113 205 118 / 38%);
	}

	.locked .icon-shell {
		filter: grayscale(1);
		opacity: 0.55;
	}

	.skill-name {
		display: -webkit-box;
		max-width: 100%;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		min-width: 0;
		overflow: hidden;
		font-family: var(--font-terminal);
		font-size: clamp(0.45rem, 0.65vw, 0.56rem);
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1.15;
		text-align: center;
		text-transform: uppercase;
	}

	.card-topline {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.2rem;
		width: 100%;
	}

	.state-mark,
	.lock-reason {
		font-family: var(--font-terminal);
		font-size: 0.38rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		line-height: 1.1;
		text-align: right;
		text-transform: uppercase;
	}

	.state-mark {
		color: var(--hud-quiet);
	}

	.selected .state-mark {
		color: var(--hud-orange-soft);
	}

	.spent .state-mark {
		color: var(--hud-cyan);
	}

	.maxed .state-mark {
		color: var(--hud-green);
	}

	.locked .state-mark,
	.lock-reason {
		color: var(--hud-danger);
	}

	.expanded-details {
		border: 1px solid var(--hud-line);
		background: var(--hud-bg);
		padding: 0.45rem;
	}

	.expanded-details p {
		margin: 0;
		color: var(--hud-muted);
		font-size: 0.68rem;
		line-height: 1.35;
	}
</style>
