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
		grid-template-columns: minmax(7rem, auto) minmax(5rem, 9rem);
		align-items: center;
		gap: 0.6rem;
	}

	.field {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.55rem;
		min-height: 3.2rem;
		border: 1px solid var(--line);
		background: var(--surface-1);
		padding: 0 0.75rem;
	}

	.field span {
		color: var(--muted);
		font-family: var(--font-terminal);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	select {
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--accent);
		font-family: var(--font-terminal);
		font-size: 1.1rem;
		font-weight: 700;
		text-align: right;
	}

	select option {
		background: var(--surface-1);
		color: var(--ink);
	}

	.range-field {
		display: flex;
		align-items: center;
		min-height: 3.2rem;
		border: 1px solid var(--line);
		background: var(--surface-1);
		padding: 0 0.65rem;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}

	@media (max-width: 520px) {
		.level-control {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}

		.range-field {
			min-height: 2.4rem;
		}
	}
</style>
