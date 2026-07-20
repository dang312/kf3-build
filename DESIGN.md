# KF3 Build — Horzine Tactical HUD

## Source of truth

The visual base for KF3 Build is the Medic detail screen in [`docs/design-source/stitch/kf3_hud_medic_detail/screen.png`](docs/design-source/stitch/kf3_hud_medic_detail/screen.png), combined with the previously approved five-tier layout and captured in [`docs/design-source/stitch/kf3_build_medic_refined/screen.png`](docs/design-source/stitch/kf3_build_medic_refined/screen.png). The icon treatment is documented and illustrated in [`docs/design-source/stitch/icon/DESIGN.md`](docs/design-source/stitch/icon/DESIGN.md) and [`docs/design-source/stitch/icon/screen.png`](docs/design-source/stitch/icon/screen.png). The exported Stitch HTML is retained at [`docs/design-source/stitch/kf3_hud_medic_detail/code.html`](docs/design-source/stitch/kf3_hud_medic_detail/code.html) as a reference only; do not copy its remote scripts, external fonts, ad-injection code, remote imagery, or fictional example data into the app.

Image generation is optional. If the configured Gemini image endpoint is unavailable, use these checked-in Stitch references directly and continue implementation. Do not block product work on image generation.

## Product expression

KF3 Build is a rugged, tactical planning terminal for simulating a Killing Floor 3 perk build. It should feel precise, dense, and game-adjacent without pretending to be the game client. Authentic extracted data and honest verification labels always outrank decorative fidelity.

### Do

- Keep Passives, Throwables, and Gadgets visible as the primary three-tree workspace.
- Dock Build Summary as a telemetry rail on wide screens.
- Keep tier unlock levels, selected state, rank, and locked state visible at the point of comparison.
- Use compact schematic skill icons with CSS-driven state treatment.
- Use sharp geometry, thin technical rules, compact spacing, and clear uppercase HUD labels.
- Preserve semantic buttons, native selects/range controls, keyboard focus, and mobile reachability.

### Do not

- Add rounded cards, decorative glassmorphism, generic SaaS dashboard patterns, or large empty hero areas.
- Use color alone to communicate selected, maxed, locked, or warning states.
- Replace real skill names/effects with the fictional examples in the Stitch export.
- Claim provisional extracted values are official or verified.

## Tokens

```css
--hud-bg: #0a0c0f;
--hud-terminal: #0b0906;
--hud-surface: #121317;
--hud-panel: #1a1c1f;
--hud-panel-high: #282a2d;
--hud-line: #3a494b;
--hud-line-bright: #849495;
--hud-ink: #e2e2e6;
--hud-muted: #b9cacb;
--hud-cyan: #00dbe7;
--hud-cyan-bright: #e1fdff;
--hud-orange: #ff8a00;
--hud-orange-soft: #ffb77f;
--hud-green: #71cd76;
--hud-warning: #dca400;
--hud-danger: #e8594d;
```

- **Fira Mono**: brand, headings, labels, levels, ranks, and telemetry.
- **Inter**: descriptions and explanatory copy.
- Base rhythm: 4px; common gaps: 4/8/12/16px.
- Corners: 0px. Borders: 1px. Use inset glow sparingly for active system energy.
- Cyan communicates active system energy and spent ranks.
- Orange communicates focus, primary action, and selected boundaries.
- Green communicates maxed/verified/success states.
- Gold communicates warnings; crimson communicates locked/error requirements.

## Layout contract

- Desktop: compact top bar, control deck, three tree columns, and a 320px Build Summary rail.
- Tablet: tree columns may scroll horizontally while the summary moves below the workspace.
- Mobile: tree columns become a single-column stack; Build Summary remains available as a bottom-oriented section and never disappears behind an inaccessible fixed overlay.
- Skill cards should prioritize icon, skill name, unlock level, and rank meter. Detailed effect text belongs in the focused detail panel or expanded mode.
- Lock state must include a text lock reason and disabled interaction, not only opacity/grayscale.

## Approval and QA

Generated visual references must be approved in the browser picker before they become a source of truth. The supplied Stitch Medic reference is already the approved fallback for this implementation. Run Impeccable detection on changed UI files when available, then `pnpm check`, `pnpm lint`, `pnpm test`, and `pnpm build` in `webapp`.
