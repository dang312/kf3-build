# kf3-build

A Killing Floor 3 website for sharing perk builds and loadouts.

## Current target

The first target is an in-game skill-tree simulator:

- Choose a perk and level.
- Show the three skill trees every perk has: `passives`, `throwable`, and `gadget`.
- Display each skill's name, unlock level, icon if available, and effect details.
- Let users select skills using rules that match the game.
- Summarize the build after skills are selected.
- Show Operational Budget / Starting Money when data exists, labeling provisional values until verified.

Future agents should read [`AGENTS.md`](./AGENTS.md) and [`CONTEXT.md`](./CONTEXT.md) before working in this repo.

## Product essentials

- Perk level + skill system.
- Skill info and build summary after selecting skills.
- Gun loadout.
- Gun mod customization.
- Link sharing.
- Operational Budget / Starting Money computed from the selected perk and level, with provisional values labeled until verified.

## Out of current scope

Do not add these without an explicit scope decision:

- Comments/discussion on builds.
- Login.
- Stored user builds.
- Reddit backlink.
- Rating.
- Match progression / economy.
- Maps view.
- Materials.

## Project docs

- [`AGENTS.md`](./AGENTS.md) — implementation guidance and handoff instructions for agents.
- [`CONTEXT.md`](./CONTEXT.md) — canonical domain glossary.
- [`docs/implementation-plan.md`](./docs/implementation-plan.md) — current implementation plan.
- [`docs/data-collection-plan.md`](./docs/data-collection-plan.md) — plan for collecting skill data from web and game-file sources.
- [`tools/kf3-data/`](./tools/kf3-data/) — local data investigation and skill-candidate collection tools. Simple rerun: `node tools/kf3-data/run-skill-collection.mjs`.
- [`docs/adr/`](./docs/adr/) — accepted architecture/domain decisions.
