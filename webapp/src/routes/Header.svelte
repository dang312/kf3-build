<header class="topbar">
	<a class="brand" href="/" aria-label="KF3 Build home">
		<strong>KF3</strong>
		<span>Build</span>
	</a>
	<p>Skill Tree Simulator</p>
</header>

<style>
	.topbar {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 110rem;
		height: 0;
		margin: 0 auto;
	}

	.brand {
		position: absolute;
		top: 1.45rem;
		left: 1.65rem;
		display: inline-flex;
		align-items: baseline;
		gap: 0.45rem;
		color: var(--ink);
		font-family: var(--font-terminal);
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1;
		text-decoration: none;
		text-transform: uppercase;
	}

	.brand strong {
		color: var(--accent);
		font-size: 1.7rem;
		letter-spacing: -0.08em;
	}

	.topbar p {
		display: none;
	}

	@media (max-width: 700px) {
		.topbar {
			height: auto;
			padding: 0.75rem 0.85rem 0;
		}

		.brand {
			position: static;
		}
	}
</style>
