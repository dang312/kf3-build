<script lang="ts">
	import Header from './Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="app">
	<Header />
	<main>{@render children()}</main>
	<footer>
		<span>KF3 BUILD // LOCAL SIMULATION</span>
		<span>Extracted game data. Pending values remain unverified.</span>
	</footer>
</div>

<style>
	.app {
		display: flex;
		min-width: 0;
		min-height: 100vh;
		flex-direction: column;
	}

	main {
		box-sizing: border-box;
		width: min(100%, 110rem);
		min-width: 0;
		margin: 0 auto;
		padding: 0.75rem 1.25rem 1.5rem;
	}

	footer {
		display: flex;
		min-width: 0;
		justify-content: space-between;
		gap: 1rem;
		margin-top: auto;
		border-top: 1px solid var(--hud-line);
		color: var(--hud-quiet);
		font-family: var(--font-terminal);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.75rem 1.25rem;
		text-transform: uppercase;
	}

	@media (max-width: 700px) {
		main {
			padding: 0.5rem 0.75rem 1.25rem;
		}

		footer {
			align-items: center;
			flex-direction: column;
			text-align: center;
		}
	}
</style>
