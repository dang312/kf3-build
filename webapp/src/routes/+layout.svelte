<script lang="ts">
	import Header from './Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="app">
	<Header />
	<main>{@render children()}</main>
	<footer>
		KF3 Build uses extracted local game data. Values marked pending remain unverified.
	</footer>
</div>

<style>
	.app {
		display: flex;
		min-height: 100vh;
		flex-direction: column;
	}

	main {
		box-sizing: border-box;
		width: 100%;
		max-width: 110rem;
		margin: 0 auto;
		padding: 0.65rem 0.85rem 1.25rem;
	}

	footer {
		margin-top: auto;
		border-top: 1px solid var(--line);
		color: var(--quiet);
		font-family: var(--font-terminal);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.85rem;
		text-align: center;
		text-transform: uppercase;
	}

	@media (min-width: 720px) {
		main {
			padding-inline: 1.25rem;
		}
	}
</style>
