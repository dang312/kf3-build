<script lang="ts">
	import type { PerkSlug, PerkSummary } from '$lib/skills/types';

	type Props = {
		perks: PerkSummary[];
		selectedPerkSlug: PerkSlug;
		onChange: (perkSlug: PerkSlug) => void;
	};

	let { perks, selectedPerkSlug, onChange }: Props = $props();

	function handleChange(event: Event) {
		const target = event.currentTarget;
		if (target instanceof HTMLSelectElement) onChange(target.value);
	}
</script>

<label class="field">
	<span>Perk</span>
	<select value={selectedPerkSlug} onchange={handleChange} aria-label="Select perk">
		{#each perks as perk (perk.slug)}
			<option value={perk.slug}>{perk.name}</option>
		{/each}
	</select>
</label>

<style>
	.field {
		display: grid;
		min-width: 0;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.7rem;
		min-height: 3rem;
		border: 1px solid var(--hud-line);
		background: var(--hud-terminal);
		padding: 0 0.7rem;
	}

	.field:focus-within {
		border-color: var(--hud-cyan);
		box-shadow: inset 0 0 7px rgb(0 219 231 / 12%);
	}

	span {
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--hud-cyan-bright);
		font-family: var(--font-terminal);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-align: right;
		text-transform: uppercase;
	}

	select option {
		background: var(--hud-surface);
		color: var(--hud-ink);
	}
</style>
