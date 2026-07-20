<script lang="ts">
	import type { PerkLevel } from '$lib/skills/types';

	type Props = {
		perkLevel: PerkLevel;
		maxLevel: PerkLevel;
		onChange: (perkLevel: PerkLevel) => void;
	};

	let { perkLevel, maxLevel, onChange }: Props = $props();
	let levels = $derived(Array.from({ length: maxLevel }, (_, index) => index + 1));

	function handleChange(event: Event) {
		const target = event.currentTarget;
		if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement) {
			onChange(Number(target.value));
		}
	}
</script>

<div class="level-control">
	<label class="field">
		<span>Level</span>
		<select value={perkLevel} onchange={handleChange} aria-label="Select perk level">
			{#each levels as level (level)}
				<option value={level}>{level}</option>
			{/each}
		</select>
	</label>
	<label class="range-field">
		<span class="visually-hidden">Level slider</span>
		<input type="range" min="1" max={maxLevel} value={perkLevel} oninput={handleChange} />
	</label>
</div>

<style>
	.level-control {
		display: grid;
		min-width: 0;
		grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
		align-items: center;
		gap: 0.4rem;
	}

	.field {
		display: grid;
		min-width: 0;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.55rem;
		min-height: 3rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-terminal);
		padding: 0 0.7rem;
	}

	.field:focus-within,
	.range-field:focus-within {
		border-color: var(--hud-cyan);
		box-shadow: inset 0 0 7px rgb(0 219 231 / 12%);
	}

	.field span {
		color: var(--hud-muted);
		font-family: var(--font-terminal);
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	select {
		min-width: 0;
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--hud-orange-soft);
		font-family: var(--font-terminal);
		font-size: 0.9rem;
		font-weight: 700;
		text-align: right;
	}

	select option {
		background: var(--hud-surface);
		color: var(--hud-ink);
	}

	.range-field {
		display: flex;
		min-width: 0;
		align-items: center;
		min-height: 3rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-terminal);
		padding: 0 0.65rem;
	}

	input[type='range'] {
		width: 100%;
		height: 0.4rem;
		accent-color: var(--hud-orange);
		cursor: pointer;
	}

	@media (max-width: 520px) {
		.level-control {
			grid-template-columns: 1fr;
			gap: 0.3rem;
		}

		.range-field {
			min-height: 2.2rem;
		}
	}
</style>
