<header class="topbar">
	<div class="topbar-inner">
		<a class="brand" href="/" aria-label="KF3 Build home">
			<span class="brand-mark">KF3</span>
			<span class="brand-name">BUILD</span>
		</a>
		<div class="system-label" aria-label="Application status">
			<span class="signal" aria-hidden="true"></span>
			<span>SKILL TREE SIMULATOR</span>
		</div>
		<div class="topbar-meta">
			<span>LOCAL DATASET</span>
			<span class="meta-divider" aria-hidden="true"></span>
			<strong>ONLINE</strong>
		</div>
	</div>
</header>

<style>
	.topbar {
		position: relative;
		z-index: 1;
		border-bottom: 1px solid rgb(0 219 231 / 22%);
		background: rgb(10 12 15 / 92%);
		box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
	}

	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: min(100%, 110rem);
		min-height: 4rem;
		margin: 0 auto;
		padding: 0 1.25rem;
	}

	.brand {
		display: inline-flex;
		align-items: baseline;
		gap: 0.5rem;
		color: var(--hud-ink);
		font-family: var(--font-terminal);
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		line-height: 1;
		text-decoration: none;
		text-transform: uppercase;
	}

	.brand-mark {
		color: var(--hud-cyan);
		font-size: 1.7rem;
		font-weight: 800;
		letter-spacing: -0.12em;
		text-shadow: 0 0 8px rgb(0 219 231 / 60%);
	}

	.brand-name {
		color: var(--hud-orange-soft);
	}

	.system-label,
	.topbar-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-terminal);
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.system-label {
		color: var(--hud-muted);
	}

	.signal {
		width: 0.45rem;
		height: 0.45rem;
		background: var(--hud-cyan);
		box-shadow: 0 0 7px var(--hud-cyan);
	}

	.topbar-meta {
		color: var(--hud-quiet);
	}

	.topbar-meta strong {
		color: var(--hud-green);
	}

	.meta-divider {
		width: 1.2rem;
		height: 1px;
		background: var(--hud-line);
	}

	@media (max-width: 700px) {
		.topbar-inner {
			min-height: 3.5rem;
			padding-inline: 0.75rem;
		}

		.system-label {
			display: none;
		}

		.topbar-meta {
			display: none;
		}
	}
</style>
