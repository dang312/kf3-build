# AGENTS.md — KF3 Build Agent Instructions

## Project mission

Build **kf3-build** as a Killing Floor 3 build planner focused first on the in-game skill tree flow:

1. Let the user choose a character/perk and character level.
2. Show the same skill categories and level-gated tiers used by the game.
3. Let the user select skills as they would in-game.
4. Show clear info for every skill: name, category, unlock level, icon if available, raw effect text, and resolved scaling values.
5. Show the outcome after selections: selected skills, combined stat changes/effects, warnings for locked or incomplete selections, and a shareable build state later.

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
- `AGENTS.md` — this file; persistent instructions for future agents.
- `webapp/` — SvelteKit app.
- `webapp/data/skill/level_requirement.json` — unlock levels for skill categories.
- `webapp/data/skill/character/*.json` — character/perk skill data.
- `webapp/src/routes/` — current SvelteKit routes. Much of this is still starter/demo content.
- `webapp/src/lib/` — place reusable simulator modules, components, and data helpers here.

## Current state to assume

This repo is early-stage. The SvelteKit starter page, Sverdle demo, demo images, and `Counter.svelte` may still exist. Replace/remove starter content as product UI is implemented, but only delete files after confirming they are unused.

The existing character JSON files may be placeholders, duplicated, or incomplete. Treat them as seed data, not final truth.

## Product scope priority

### Essential first milestone

Create a useful skill-tree simulator before expanding into weapons/loadouts:

- Character/perk selector.
- Level selector, defaulting to the max level supported by data when appropriate.
- Skill tree grouped by category:
  - `passives`
  - `throwable`
  - `gadget`
- Tier rows unlocked by `webapp/data/skill/level_requirement.json`.
- Skill card UI for each option in a row.
- Selection rules that match the game as closely as known.
- Outcome panel summarizing the build after selecting skills.

### Later milestones

Keep code ready for these README goals, but do not block the first milestone on them:

- Gun loadout.
- Mod customization.
- Link sharing.
- Operational budget / starting money.
- Comments, login, saved builds, Reddit backlink, rating.
- Match progression / economy.
- Maps and materials.

## Domain model vocabulary

Use consistent names in code and UI:

- **Character** or **Perk**: playable KF3 character/perk data file.
- **SkillCategory**: `passives`, `throwable`, or `gadget`.
- **SkillTier**: one level-gated row within a category.
- **SkillOption**: one selectable skill in a tier.
- **Selection**: the user’s chosen skill option for a category/tier.
- **BuildState**: selected character, level, skill selections, and later loadout choices.
- **Outcome**: computed summary of selected effects, resolved values, and warnings.

## Skill data contract

Prefer typed helpers over ad hoc JSON access. Create TypeScript types near `webapp/src/lib/skills/` when implementing.

Expected data shape from current files:

```ts
type SkillCategory = 'passives' | 'throwable' | 'gadget';

type CharacterSkillData = {
  name: string;
  character: string;
  skillTable: Record<SkillCategory, SkillOption[][]>;
  proficiency?: ProficiencyEntry[];
};

type SkillOption = {
  name: string;
  icon?: string;
  effect: {
    type?: string;
    description: string;
    values?: Record<string, number[]>;
  };
  values?: Record<string, number[]>;
};
```

Notes:

- Existing JSON sometimes stores `values` on the skill and sometimes inside `effect`. Support both until data is normalized.
- Descriptions may contain HTML-like fragments such as `<br />`, `<b>`, and placeholders like `{{X}}`.
- Resolve placeholders from `values` for display. If the selected level/rank is unclear, show the available range instead of inventing a formula.
- If real game data is uncertain, mark it clearly as `TODO: verify` or add a source note. Do not fabricate official-looking values.
- Keep data import paths stable and avoid hard-coding individual character file names in UI components when a registry can be used.

## Simulator behavior requirements

- A skill is locked when the selected character level is below that tier’s required level.
- Locked skills must be visible but visually disabled and not selectable.
- If lowering the character level makes a selected skill locked, either clear that selection or show a warning and exclude it from the active outcome. Prefer the behavior that best matches the game once known.
- A tier usually allows one selected option per category/tier. If the real game allows multiple choices in a tier, encode that rule in data instead of burying it in UI logic.
- Outcome computation must be deterministic and based only on `BuildState` + skill data.
- Keep state serializable so future share links can encode/decode builds from the URL.

## Recommended implementation shape

Put simulator logic under `webapp/src/lib/skills/`:

- `types.ts` — public TypeScript types.
- `data.ts` — load/normalize character skill JSON and level requirements.
- `selection.ts` — pure functions for selecting, clearing, locking, and validating selections.
- `outcome.ts` — pure functions that turn selections into outcome summaries.
- `format.ts` — placeholder interpolation and safe rendering helpers.

Put reusable UI under `webapp/src/lib/components/`:

- `CharacterSelector.svelte`
- `LevelSelector.svelte`
- `SkillTree.svelte`
- `SkillTier.svelte`
- `SkillCard.svelte`
- `OutcomePanel.svelte`

Keep Svelte route files thin. They should compose data, state, and components, not contain most business rules.

## UI/UX expectations

- Design for quick comparison of options in the same tier.
- Always show unlock level for each tier.
- Show selected/locked/available states clearly.
- Outcome panel should stay visible on desktop and remain easy to reach on mobile.
- Use accessible controls: buttons for selectable skills, labels for inputs/selects, keyboard focus states, and `aria-pressed` or equivalent for selections.
- Avoid `{@html}` unless a sanitizer/controlled renderer is used. Skill descriptions contain markup-like strings; render them safely.
- Keep the app usable on mobile screens.

## Code quality rules

- Use TypeScript strictly; avoid `any` unless quarantining raw JSON before normalization.
- Prefer pure functions for game/build rules.
- Prefer small reusable components over one large page component.
- Do not duplicate skill rules across UI and outcome code.
- Keep imports and filenames lowercase/kebab-case unless Svelte component convention applies.
- Follow existing formatting with tabs in Svelte/TS files if Prettier applies it.
- Do not commit generated build output or `node_modules/`.

## Testing and validation guidance

When adding logic, add tests if a test framework is available or introduce Vitest with a small focused setup if needed. Prioritize tests for:

- Level unlock checks.
- One-selection-per-tier behavior.
- Clearing/excluding locked selections after level changes.
- Placeholder interpolation.
- Outcome aggregation.
- URL build-state encode/decode once implemented.

Manual validation checklist for UI changes:

1. Select each character/perk.
2. Change level below and above unlock thresholds.
3. Select a skill in every available tier.
4. Switch selections within a tier.
5. Confirm locked skills cannot affect the outcome.
6. Confirm outcome text matches selected skills.
7. Run `pnpm check` and fix TypeScript/Svelte errors.

## Data accuracy and sources

KF3 data may change with patches. When updating skill data:

- Prefer official in-game text or verified patch notes.
- Add comments in commits/PRs describing the data source. JSON does not support comments, so avoid inline comments in JSON files.
- Preserve exact wording when copying skill descriptions, but normalize structure around it.
- If icons/assets are added, confirm licensing and attribution before committing.

## Handoff style for future agents

At the end of meaningful work, summarize:

- What changed.
- Files touched.
- Commands run and their results.
- Any assumptions about game rules/data.
- The next smallest task.

If blocked by missing game data, continue by improving structure/UI with clearly labeled placeholders rather than inventing final values.
