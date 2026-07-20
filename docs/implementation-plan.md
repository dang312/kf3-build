# Implementation Plan

This plan turns the current domain model into a small, usable KF3 build simulator before expanding into full loadouts.

## Milestone 0 — Data collection pipeline

Goal: collect reviewable perk skill data from web and local game-file sources without committing raw game assets.

1. Inventory and collect candidates from the local Nightfall install with `tools/kf3-data/inventory-game-files.mjs`, `tools/kf3-data/run-skill-collection.mjs`, and `tools/kf3-data/collect-skill-candidates.mjs`.
   - Confirm package files under `Nightfall/Content/Paks/`.
   - Extract candidate skill names from `Nightfall/Content/Movies/SkillPreviews/` filenames.
   - Use English `Game.locres` for localized skill names/descriptions when extracted.
   - Use raw `SPEC_*_{Passive,Grenade,Gadget}SkillTree.uasset` files for the three perk skill trees: `passives`, `throwable`, and `gadget`.
   - Write reviewable candidate JSON and markdown reports under ignored `scratch/` paths.
2. Research official/community web sources for skill names, effect text, category/tier placement, level gates, proficiency, and Operational Budget.
   - Treat community-only values as provisional.
   - Record source URLs and access dates outside JSON comments.
3. Use FModel read-only to inspect Unreal assets.
   - Use a KF3/UE mapping file (`.usmap`) if property names require it.
   - Export candidate DataTables/DataAssets/localization resources to ignored `scratch/fmodel-export/`.
4. Add focused import/validation tooling after remaining asset shapes are known.
   - `run-skill-collection.mjs` gives a simple rerun path and can refresh local UEExtractor outputs.
   - `collect-skill-candidates.mjs` can already combine preview filenames, locres descriptions, raw skill-tree tiers, level requirement JSON, and optional text/JSON FModel export matches.
   - `import-fmodel-export.mjs` should convert known FModel DataTable/DataAsset exports into normalized candidate perk JSON.
   - `validate-normalized-data.mjs` should fail on duplicate `PerkSlug` or `SkillSlug`, malformed tiers, and unresolved placeholders.
5. Review candidate data manually before copying normalized records into `webapp/data/skill/`.

See `docs/data-collection-plan.md` for the detailed workflow.

## Milestone 1 — Skill-tree simulator

Goal: users can choose a perk, set level, select legal skills, and read a build summary.

1. Normalize data into typed app records under `webapp/src/lib/skills/`.
   - Add `types.ts`, `data.ts`, `format.ts`, and validation helpers.
   - Normalize legacy raw files from `webapp/data/skill/character/*.json` into Perk terminology.
   - Require normalized `PerkSlug` and globally unique `SkillSlug`; temporary derived slugs are allowed only for placeholder seed data.
2. Implement pure build rules.
   - `selection.ts`: one selected skill per `SkillSlot`, replacement on selection, duplicate slot validation.
   - `budget.ts`: compute `OperationalBudget` from a perk's structured formula and `PerkLevel` when formula data exists.
   - `build-summary.ts`: derive selected skills, resolved text, provisional budget notes, and warnings from `BuildState` plus normalized data.
3. Build the UI components.
   - `PerkSelector.svelte`
   - `PerkLevelSelector.svelte` with UI label “Level”
   - `SkillTree.svelte`, `SkillTier.svelte`, `SkillCard.svelte`
   - `BuildSummaryPanel.svelte`
4. Replace starter route content with the simulator composition.
5. Validate manually and run `pnpm check` before handoff.

## Milestone 1.5 — Stitch-first visual system and icon-first UI

Goal: approve the visual direction in Stitch before implementing or redesigning the Svelte frontend, then use the approved design to deliver an in-game-like compact `SkillTreeView`.

Design gate (completed for the current redesign):
- Stitch project: `projects/4988160711639323392`.
- Combined source direction: the previously approved five-tier KF3 layout in `.pi/ui-renders/kf3-ui-direction-a-v2.png`, the Medic HUD source in `docs/design-source/stitch/kf3_hud_medic_detail/screen.png`, and the full icon library in `docs/design-source/stitch/icon/screen.png`.
- The refined Stitch desktop concept removes fictional navigation, uses the authentic Medic tier gates, retains a 320px Build Summary rail, and uses cyan/orange/green/locked icon states.
- Frontend work must wait for the browser approval picker. Use Stitch first for future redesigns; use image-gen2 only as a fallback when Stitch is unavailable.

Goal: replace the current full-text skill cards with an in-game-like compact `SkillTreeView` after real skill icons are available.

Status: first implementation is in place. The webapp now has real generated, browser-visible in-game-style silhouette icons, compact three-column skill trees, denser three-option tier rows, a `SkillDetailPanel`, and an `Extended view` toggle for inline detail text.

1. Generate and promote real skill icons first with `tools/kf3-data/generate-skill-icons.mjs`.
   - Output icons to `webapp/static/skill-icons/{perkSlug}/{skillSlug}.webp`.
   - Update `SkillOption.icon` and icon source metadata in perk JSON.
   - Apply the approved icon-library palette deterministically with `tools/kf3-data/style-skill-icons.mjs`; preserve glyph identity and alpha masks while leaving selected/maxed/locked state colors to CSS.
   - Allow partial icon coverage during development, but do not start the compact in-game-style UI until real icons are available for the first pass.
2. Build the compact in-game-like skill tree presentation.
   - Three columns: `passives`, `throwable`, and `gadget`.
   - Level-labeled tier rows.
   - Icon-first skill nodes using real icons, with generated placeholders only for unresolved stragglers.
   - Visual selected, available, locked, and focused states.
3. Add `SkillDetailPanel` as the primary side-panel readout.
   - Show the last focused skill, defaulting to the first available skill for the selected perk.
   - Hover/focus updates the panel; click selects/toggles and focuses the skill.
   - If a focused skill becomes locked after lowering level, keep it focused and show locked state.
4. Add `ExpandedDetailsMode` after the compact/icon view is in place.
   - Keep default mode compact.
   - Expanded mode reveals full descriptions, unlocks, source info, and later scaling/rank details inline.
   - Do not change `BuildState` or selection rules.

## Milestone 2 — Shareable build state

Goal: users can share selected perk, level, and skill choices by URL.

1. Add encode/decode helpers for canonical `BuildState`.
2. Decode using central `PerkSlugMigrationMap` and `SkillSlugMigrationMap`.
3. Reject duplicate `SkillSelection` entries for the same `SkillSlot` as invalid shared build data.
4. Keep operational budget derived from data, not stored independently in share state.
5. Decide before implementation whether shared build payloads need an explicit schema/data version marker.

## Milestone 3 — Loadout expansion

Goal: expand from skills into the rest of the build planner.

1. Add gun selection.
2. Add gun mod choices.
3. Integrate operational budget / starting money into loadout affordability once weapon and mod data exist.

## Data work still required

- Decode exact game-file source for skill unlock level gates; current collection applies `webapp/data/skill/level_requirement.json` after reading raw skill-tree tiers.
- Decode the remaining eight `MultiplyBy` skill scaling baselines from `SPEC_*_Skills_DT.uasset`; local curve extraction has already populated reviewed rank-0–3 arrays for 190 skills. See `docs/skill-rank-scaling-analysis.md`.
- Locate exact Unreal asset paths that contain proficiency data and Operational Budget values/formulas.
- Replace duplicated placeholder perk JSON with real perk skill data.
- Hand-author production `PerkSlug` and globally unique `SkillSlug` values in JSON.
- Verify exact Operational Budget formulas from official, in-game, local game-file, or well-corroborated community sources.
- Label provisional Operational Budget values in the UI until verified.
- Verify whether locked selections should be cleared or retained with warnings when lowering level.
