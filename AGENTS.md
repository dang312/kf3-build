# AGENTS.md — KF3 Build Agent Instructions

## Project mission

Build **kf3-build** as a Killing Floor 3 build planner for sharing perk skill selections, gun mod choices, and perk-level-derived operational budget/starting money, focused first on the in-game skill tree flow:

1. Let the user choose a perk and perk level.
2. Show the same three skill trees and level-gated tiers used by the game.
3. Let the user select skills as they would in-game.
4. Show clear info for every skill: name, category, unlock level, icon if available, raw effect text, and resolved scaling values.
5. Show a build summary after selections: selected skills, combined stat changes/effects, warnings for locked or incomplete selections, and a shareable build state later.

Use the word **simulate** for this target. Do not call it “stimulate” in product copy unless quoting user input.

## Tech stack and commands

The application lives in `webapp/`.

- Framework: SvelteKit 2 / Svelte 5
- Language: TypeScript
- Build tool: Vite
- Package manager: pnpm
- Styling: existing app CSS plus Tailwind CSS v4 dependency when useful

Common commands:

```sh
cd webapp
pnpm install
pnpm dev -- --open
pnpm check
pnpm lint
pnpm build
pnpm format
```

Before handing off code changes, run at least `pnpm check` and, when practical, `pnpm lint` and `pnpm build`.

## Repository map

- `README.md` — product-level goals and roadmap.
- `CONTEXT.md` — canonical domain glossary.
- `AGENTS.md` — this file; persistent instructions for future agents.
- `docs/implementation-plan.md` — current milestone plan.
- `docs/data-collection-plan.md` — plan for collecting skill data from web and local game-file sources.
- `docs/adr/` — accepted architecture/domain decisions.
- `tools/kf3-data/` — local data investigation and skill-candidate collection helpers; outputs should go to ignored `scratch/` paths.
- `webapp/` — SvelteKit app.
- `webapp/data/skill/level_requirement.json` — unlock levels for skill categories.
- `webapp/data/skill/character/*.json` — current raw perk skill data. The directory name is legacy seed-data wording; use **Perk** as the canonical product/domain term.
- `webapp/src/routes/` — current SvelteKit routes. Much of this is still starter/demo content.
- `webapp/src/lib/` — place reusable simulator modules, components, and data helpers here.

## Current state to assume

This repo is early-stage. The SvelteKit starter page, Sverdle demo, demo images, and `Counter.svelte` may still exist. Replace/remove starter content as product UI is implemented, but only delete files after confirming they are unused.

The existing perk JSON files may be placeholders, duplicated, or incomplete. Treat them as seed data, not final truth.

## Product scope priority

### Essential first milestone

Create a useful skill-tree simulator before expanding into weapons/loadouts:

- Perk selector.
- Perk level selector, labeled as “Level” in the UI and defaulting to the max level supported by data when appropriate.
- The three skill trees every perk has, grouped by category:
  - `passives`
  - `throwable`
  - `gadget`
- Tier rows unlocked by `webapp/data/skill/level_requirement.json`.
- Skill card UI for each option in a row.
- Selection rules that match the game as closely as known.
- Build summary panel summarizing the selected skills, warnings, and derived values after selecting skills.

### Later milestones

After the skill-tree flow, expand toward sharing skill selections, gun mod choices, and perk-level-derived operational budget/starting money unless the user explicitly reprioritizes scope:

- Gun and gun mod selection.
- Operational budget / starting money derived from the selected `PerkSlug` + `PerkLevel` using the formula stored in that perk’s JSON.
- Link sharing.

Do not expand into comments, login, ratings, match economy, maps, or materials without a new explicit scope decision.

## Domain model vocabulary

Use consistent names in code and UI:

- **Perk**: playable KF3 perk represented by a skill data file. Use **Perk** as the canonical term in code and UI; avoid **Character**, **Class**, or **Role** except when quoting source material or referring to legacy raw data paths/fields.
- **PerkSlug**: globally unique, hand-authored stable identifier for a `Perk`. Store selected perk identity as `perkSlug`; do not derive identity from display names or raw file paths.
- **PerkSlugMigrationMap**: central compatibility map that resolves legacy perk slugs to current perk slugs when decoding saved or shared build states.
- **PerkLevel**: the selected progression level for a perk. Use `PerkLevel` as the domain/type name and `perkLevel` as the state field; UI labels may say “Level”.
- **OperationalBudget**: starting-money budget available to the build, fixed for each selected `PerkSlug` + `PerkLevel` pair. UI copy may say “Starting Money” when clearer; provisional values must be labeled as subject to later updates.
- **SkillCategory**: one of the three skill trees every perk has: `passives`, `throwable`, or `gadget`. Game assets may label these as Passive/PASSIVES, Throwable/THROWABLE, and Gadget/GADGET; normalize them to the TypeScript keys.
- **SkillTier**: one level-gated row within a category.
- **SkillTierNumber**: one-based tier number used in domain state and UI-facing labels. It matches how users see tiers; use local zero-based array indexes only as implementation details when iterating raw arrays.
- **SkillSlot**: one selectable position in the tree, identified by `SkillCategory` + one-based `SkillTierNumber`.
- **SkillOption**: one selectable skill in a tier.
- **SkillSlug**: globally unique, hand-authored stable identifier for a `SkillOption` across all perk JSON files. Use skill slugs in selections and shareable build state; do not store selected skills by array index, derive identity from display names, or require `(perk, skillSlug)` pairs for uniqueness.
- **SkillSlugMigrationMap**: central compatibility map that resolves legacy global skill slugs to current global skill slugs when decoding saved or shared build states. Do not scatter slug aliases across individual skill JSON files.
- **Proficiency**: a non-selectable per-perk progression/stat entry from the data. Show it separately from skill choices until verified game rules say it affects build summaries.
- **SkillRank**: nonnegative whole number of upgrade points spent in a selected `SkillOption`; use it to resolve effect values. A rank of zero means the skill remains equipped with its local-game-data base effect and no upgrade points spent.
- **SkillSelection**: one selected-skill entry that assigns a `SkillSlug` and nonnegative `SkillRank` to a `SkillSlot`; serialize it with explicit `category`, `tierNumber`, `skillSlug`, and `rank` fields. A selected rank-zero skill satisfies that row’s prerequisite for the next tier.
- **SkillSelections**: serializable array of `SkillSelection` entries, not a flat slug list and not an object whose nesting hides the slot fields.
- **BuildState**: canonical serializable build data: selected perk slug, perk level, skill selections, and later loadout choices.
- **BuildSummary**: computed read-only summary of selected skills, resolved values, derived operational budget, and warnings. Use **Build Summary** in UI copy; avoid **Outcome** in product copy.

## Skill data contract

Prefer typed helpers over ad hoc JSON access. Create TypeScript types near `webapp/src/lib/skills/` when implementing.

Expected normalized app data and build-state shapes. Raw seed JSON may need adaptation in `data.ts` before it reaches simulator code:

```ts
type PerkSlug = string;

type PerkSlugMigrationMap = Record<PerkSlug, PerkSlug>;

type PerkLevel = number;

type OperationalBudget = number;

type OperationalBudgetFormula = {
  type: string; // Known formula identifier implemented by budget helpers; never eval executable strings.
  parameters: Record<string, number>;
  verificationStatus: "provisional" | "verified";
  sourceNote?: string;
};

type SkillSlug = string;

type SkillSlugMigrationMap = Record<SkillSlug, SkillSlug>;

type SkillCategory = "passives" | "throwable" | "gadget";

type SkillTierNumber = number; // One-based; matches UI-facing tier numbering.

type SkillSlot = {
  category: SkillCategory;
  tierNumber: SkillTierNumber;
};

type SkillRank = number; // Nonnegative whole number of points spent in an equipped skill.

type SkillSelection = SkillSlot & {
  skillSlug: SkillSlug;
  rank: SkillRank;
};

type SkillSelections = SkillSelection[];

type BuildState = {
  perkSlug: PerkSlug;
  perkLevel: PerkLevel;
  skillSelections: SkillSelections;
};

type PerkSkillData = {
  slug: PerkSlug; // Globally unique, hand-authored in JSON, and stable across display-name changes.
  name: string;
  character: string; // Legacy raw-data field; normalize to a perk identity in app helpers.
  operationalBudgetFormula?: OperationalBudgetFormula;
  skillTable: Record<SkillCategory, SkillOption[][]>;
  proficiency?: ProficiencyEntry[];
};

type SkillOption = {
  slug: SkillSlug; // Globally unique, hand-authored in JSON, and stable across display-name changes.
  name: string;
  icon?: string;
  effect: {
    type?: string;
    description: string;
    values?: Record<string, number[]>;
  };
  values?: Record<string, number[]>;
  rankCap?: SkillRank; // Per-skill upgrade-point cap from local game data; 0 means no upgrade ranks and no rank meter. Do not treat the game UI’s three-rank display as universal.
};

type ProficiencyEntry = {
  name: string;
  description: string;
  values?: Record<string, number[]>;
};
```

Notes:

- Existing JSON sometimes stores `values` on the skill and sometimes inside `effect`. Support both until data is normalized.
- `OperationalBudget` is derived from the selected `PerkSlug` + `PerkLevel` using the selected perk’s `operationalBudgetFormula`; the same perk at the same level has one fixed operational budget.
- Store the operational budget formula inside each perk JSON file, not in a separate cross-perk budget table.
- The exact operational budget formula is TODO: verify from official, in-game, or well-corroborated community sources before treating values as final.
- Use the best available `operationalBudgetFormula` when one is present, even if provisional, but clearly show a note that provisional starting-money values may update later.
- If no credible formula/data exists for a perk yet, omit `operationalBudgetFormula` and show budget as pending verification instead of inventing official-looking values.
- Keep formulas structured and handled by known budget helpers; do not store executable formula strings or evaluate arbitrary code from JSON.
- Include a `verificationStatus` and, when useful, a `sourceNote` with budget formulas so the UI can distinguish verified values from provisional values.
- Do not store `OperationalBudget` independently in canonical `BuildState` or share state unless a later explicit requirement adds budget overrides.
- Every normalized `PerkSkillData` must have a stable, globally unique `slug`; selected perk identity and future share links should reference `PerkSlug`, not display names or raw file paths.
- Real perk JSON should hand-author top-level `slug`. Do not derive production perk slugs from `name`, because display names and official wording may need easy renames without breaking build state.
- Validate that perk slugs are unique across all perk data files during data loading, linting, or tests; duplicate slugs should fail loudly.
- If a published perk slug must be renamed after share links exist, add the rename to a central `PerkSlugMigrationMap` used by build-state/share-link decoding instead of silently breaking old build states.
- Keep perk slug migrations out of individual perk JSON files; perk files should contain the current canonical slug only.
- Every normalized `SkillOption` must have a stable, globally unique `slug`; selected skills and future share links should reference `SkillSlug`, not option indexes.
- Real skill JSON should hand-author `slug` on each `SkillOption`. Do not derive production slugs from `name`, because display names and official wording may need easy renames without breaking build state.
- Validate that skill slugs are unique across all perk data files during data loading, linting, or tests; duplicate slugs should fail loudly.
- Raw seed JSON may temporarily omit perk or skill slugs. Normalize those records in one place with clearly temporary derived slugs, and treat explicit hand-authored slugs as required before promising long-lived share-link compatibility.
- If a published skill slug must be renamed after share links exist, add the rename to a central `SkillSlugMigrationMap` used by build-state/share-link decoding instead of silently breaking old build states.
- Keep slug migrations out of individual skill JSON files; skill files should contain the current canonical slug only.
- Proficiency entries are part of the data contract, but should be display-only for the first simulator milestone unless verified game rules define how they affect build summaries.
- Descriptions may contain HTML-like fragments such as `<br />`, `<b>`, and placeholders like `{{X}}`.
- Resolve placeholders from `values` for display. If the selected level/rank is unclear, show the available range instead of inventing a formula.
- If real game data is uncertain, mark it clearly as `TODO: verify` or add a source note. Do not fabricate official-looking values.
- Keep data import paths stable and avoid hard-coding individual perk file names in UI components when a registry can be used.

## Simulator behavior requirements

- A skill is locked when the selected perk level is below that tier’s required level.
- Locked skills must be visible but visually disabled and not selectable.
- If lowering the perk level makes a selected skill locked, either clear that selection or show a warning and exclude it from the active build summary. Prefer the behavior that best matches the game once known.
- A tier usually allows one selected option per category/tier. If the real game allows multiple choices in a tier, encode that rule in data instead of burying it in UI logic.
- Build summary computation must be deterministic and based only on `BuildState` + normalized skill/budget data.
- `BuildState` must store the selected perk by `PerkSlug`, not by display name or raw file path.
- `BuildState` must store selected skills by `SkillSlug`, not by skill option indexes.
- `BuildState.skillSelections` must be an array of `SkillSelection` entries with explicit `category`, `tierNumber`, `skillSlug`, and nonnegative `rank` fields; do not store it as a flat `SkillSlug[]` or as nested object keys that hide the slot fields.
- Canonical `BuildState` validation must reject duplicate `SkillSelection` entries for the same `SkillSlot`.
- UI selection actions must replace the existing entry for a `SkillSlot` rather than appending duplicates.
- URL/share-state decoding must reject duplicate slot entries as invalid shared build data; do not silently repair ambiguity by choosing one selected skill for that slot.
- Translate raw array indexes to one-based `SkillTierNumber` at the boundary; do not leak zero-based array indexes into serializable build state or UI-facing domain code.
- Keep state serializable so future share links can encode/decode builds from the URL.

## Recommended implementation shape

Put simulator logic under `webapp/src/lib/skills/`:

- `types.ts` — public TypeScript types.
- `data.ts` — load/normalize perk skill JSON, including each perk’s operational budget formula, level requirements, and the central perk/skill slug migration maps.
- `budget.ts` — pure functions that compute `OperationalBudget` from `PerkSkillData` + `PerkLevel`.
- `selection.ts` — pure functions for selecting, clearing, locking, and validating selections.
- `build-summary.ts` — pure functions that turn selections into build summaries.
- `format.ts` — rank-aware placeholder interpolation and safe rendering helpers.

Put reusable UI under `webapp/src/lib/components/`:

- `PerkSelector.svelte`
- `PerkLevelSelector.svelte`
- `SkillTree.svelte`
- `SkillTier.svelte`
- `SkillCard.svelte`
- `BuildSummaryPanel.svelte`

Keep Svelte route files thin. They should compose data, state, and components, not contain most business rules.

## UI/UX expectations

### Visual approval workflow

- The current visual source of truth is [`DESIGN.md`](./DESIGN.md), based on the Medic HUD source at [`docs/design-source/stitch/kf3_hud_medic_detail/screen.png`](./docs/design-source/stitch/kf3_hud_medic_detail/screen.png). The icon reference is [`docs/design-source/stitch/icon/screen.png`](./docs/design-source/stitch/icon/screen.png). Preserve the Horzine Tactical HUD direction: sharp 0px geometry, Fira Mono/Inter typography, dense three-tree layout, cyan active energy, orange focus, green maxed states, and a reachable Build Summary telemetry rail.
- Design-first rule: for substantial UI work, complete the Stitch design pass and browser approval before editing frontend code. Combine the previously approved KF3 direction with the Medic HUD and icon references; do not skip directly to implementation.
- When creating a new Google Stitch concept, follow [`docs/stitch-starter-project.md`](./docs/stitch-starter-project.md) and treat its output as a reference subject to this approval workflow. If Stitch is unavailable, use image-gen2; if both are unavailable, use the checked-in Stitch Medic HUD reference and continue.
- The exported Stitch HTML is reference material only. Do not copy its remote scripts, external font dependencies, injected browser scripts, remote imagery, or fictional example skill data into production.
- Every generated UI mock or visual reference requires browser-based approval before implementation, even when there is only one candidate.
- A single-candidate picker must show Direction A (the candidate), Direction B (the current default implementation or approved reference), and Direction C (not approved). A multi-candidate picker uses Directions A/B for the candidates and Direction C for rejection. Feedback is available on every option and required for Direction C.
- Serve the picker with `/home/dang312/.pi/agent/extensions/ui-review-callback/ui-review-picker.py` and launch its local URL in the browser. Do not only paste an image or URL into the chat.
- After revision feedback, regenerate the mock, update the picker, clear the consumed callback file, and re-open the browser until an A/B choice is submitted with no feedback.

- Design for quick comparison of options in the same tier.
- Always show unlock level for each tier.
- Show selected/locked/available states clearly.
- Build summary panel should stay visible on desktop and remain easy to reach on mobile.
- Use accessible controls: buttons for selectable skills, labels for inputs/selects, keyboard focus states, and `aria-pressed` or equivalent for selections.
- Avoid `{@html}` unless a sanitizer/controlled renderer is used. Skill descriptions contain markup-like strings; render them safely.
- Keep the app usable on mobile screens.

## Code quality rules

- Use TypeScript strictly; avoid `any` unless quarantining raw JSON before normalization.
- Prefer pure functions for game/build rules.
- Prefer small reusable components over one large page component.
- Do not duplicate skill rules across UI and build summary code.
- Keep imports and filenames lowercase/kebab-case unless Svelte component convention applies.
- Follow existing formatting with tabs in Svelte/TS files if Prettier applies it.
- Do not commit generated build output or `node_modules/`.

## Testing and validation guidance

When adding logic, add tests if a test framework is available or introduce Vitest with a small focused setup if needed. Prioritize tests for:

- Level unlock checks.
- One-selection-per-tier behavior.
- Clearing/excluding locked selections after level changes.
- Placeholder interpolation.
- Build summary aggregation.
- URL build-state encode/decode once implemented.

Manual validation checklist for UI changes:

1. Select each perk.
2. Change level below and above unlock thresholds.
3. Select a skill in every available tier.
4. Switch selections within a tier.
5. Confirm locked skills cannot affect the build summary.
6. Confirm build summary text matches selected skills.
7. Run `pnpm check` and fix TypeScript/Svelte errors.

## Data accuracy and sources

KF3 data may change with patches. When updating skill data:

- Follow `docs/data-collection-plan.md` for web research, game-file investigation, source priority, and repo hygiene.
- Prefer local game-file/in-game verification or official patch notes over community pages when values conflict.
- Use community/fan sources as provisional unless corroborated; label provisional data in UI when exposed.
- Add comments in commits/PRs describing the data source. JSON does not support comments, so avoid inline comments in JSON files.
- Preserve exact wording when copying skill descriptions, but normalize structure around it.
- Keep raw game archives, bulk FModel exports, and local extractor output out of git; use ignored `scratch/` paths.
- If icons/assets are added, confirm licensing and attribution before committing.

## Handoff style for future agents

At the end of meaningful work, summarize:

- What changed.
- Files touched.
- Commands run and their results.
- Any assumptions about game rules/data.
- The next smallest task.

If blocked by missing game data, continue by improving structure/UI with clearly labeled placeholders rather than inventing final values.
