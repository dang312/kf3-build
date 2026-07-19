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
		grid-template-columns: auto minmax(9rem, 1fr);
		align-items: center;
		gap: 0.7rem;
		min-height: 3.2rem;
		border: 1px solid var(--line);
		background: var(--surface-1);
		padding: 0 0.75rem;
	}

	span {
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
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	select option {
		background: var(--surface-1);
		color: var(--ink);
	}
</style>
