# Google Stitch starter project

Use Google Stitch as the design stage before changing the SvelteKit app. Treat generated screens and code as references, not production replacements. The current project is `projects/4988160711639323392` and the current design-system asset is `assets/667821455571339371`.

## Combined design reference

1. **Functional layout:** [`../.pi/ui-renders/kf3-ui-direction-a-v2.png`](../.pi/ui-renders/kf3-ui-direction-a-v2.png) — the previously approved dense five-tier layout and right Build Summary rail.
2. **Visual base:** [`design-source/stitch/kf3_hud_medic_detail/screen.png`](design-source/stitch/kf3_hud_medic_detail/screen.png) — Medic HUD color, telemetry framing, and sharp geometry.
3. **Icon states:** [`design-source/stitch/icon/screen.png`](design-source/stitch/icon/screen.png) — active, inactive, and locked schematic icon treatment.
4. **Written contract:** [`../DESIGN.md`](../DESIGN.md).
5. **Refined Stitch concept:** [`design-source/stitch/kf3_build_medic_refined/screen.png`](design-source/stitch/kf3_build_medic_refined/screen.png).

The refined Stitch desktop concept combines these references. Keep all five authentic tier rows for each tree, the three-tree workspace, 320px summary rail, and real skill icons. Do not copy fictional examples, remote scripts, remote fonts, injected scripts, or external images from Stitch exports.

## Create the starter project

1. Read [`PRODUCT.md`](../PRODUCT.md), [`DESIGN.md`](../DESIGN.md), and the UI rules in [`AGENTS.md`](../AGENTS.md).
2. Create or open the Stitch project and configure a dark sharp-corner design system before screen generation.
3. Feed Stitch the combined functional layout, Medic HUD, and icon references above; generate the desktop screen first.
4. Remove invented navigation and verify authentic tier counts, level gates, and data caveats against the repo before approving.
5. Serve the browser picker from `/home/dang312/.pi/agent/extensions/ui-review-callback/ui-review-picker.py`; approve Direction A/B with empty feedback before frontend implementation.
6. Generate mobile later when the responsive milestone is active.
7. Export or copy useful design/code only as a reference. Adapt it to the existing SvelteKit components and domain helpers instead of replacing the app wholesale.

## Starter prompt

```text
Design a responsive starter interface for “KF3 Build,” a Killing Floor 3 perk skill-tree simulator.

The product should feel like a rugged, tactical armory terminal: decisive, compact, and highly legible. Do not use bright sci-fi neon, glassmorphism, oversized soft cards, or a generic SaaS dashboard.

Include:
- a Perk selector and Level control;
- three skill trees labeled Passives, Throwable, and Gadget;
- level-gated tier rows with clear selected, available, and locked states;
- compact skill options that support quick comparison;
- a visible Build Summary with selected skills, warnings, resolved effects, and Starting Money when available;
- honest labels for provisional or unverified game data.

Create a desktop layout with the Build Summary kept within reach, plus a mobile layout where the summary remains easy to access. Use semantic controls, keyboard-visible focus, WCAG AA contrast, and state indicators that do not rely on color alone. Preserve the same information hierarchy across both layouts.
```

Stitch workflows and controls can change; use the current product UI while preserving the sequence above. See Google’s [Stitch introduction](https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/) for the prompt-or-image workflow.
