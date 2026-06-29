# Data Collection Plan

This plan describes how to collect KF3 perk skill data, proficiency data, level gates, icons/previews, and Operational Budget / Starting Money values with enough provenance to update the simulator safely.

## Goals

- Prefer data that can be reproduced from the local game install or official sources.
- Use web sources to bootstrap and cross-check, not as silent final truth.
- Keep raw game archives and bulk exports out of git.
- Preserve enough source notes that later patches can be audited and refreshed.

## Source priority

1. **Local game files / in-game verification** — preferred source for skill names, descriptions, values, perk data, level gates, and budget formulas when readable.
2. **Official sources** — patch notes, official posts, or store/news pages that describe changed values.
3. **Community/fan sources** — useful for discovery and provisional values, but label as provisional until confirmed.
4. **Manual transcription** — acceptable only with a source note and a TODO to verify.

## Known local install

The user-provided Windows install root is:

```text
C:\Program Files (x86)\Steam\steamapps\common\Nightfall
```

From WSL/Linux in this repo, it is available as:

```text
/mnt/c/Program Files (x86)/Steam/steamapps/common/Nightfall
```

Initial inspection found Unreal-style packaged content at:

```text
Nightfall/Content/Paks/Nightfall-WindowsClient.pak
Nightfall/Content/Paks/Nightfall-WindowsClient.ucas
Nightfall/Content/Paks/Nightfall-WindowsClient.utoc
Nightfall/Content/Paks/global.ucas
Nightfall/Content/Paks/global.utoc
```

Initial inspection also found skill preview videos under:

```text
Nightfall/Content/Movies/SkillPreviews/
```

The current inventory tool finds 149 preview files, 148 unique candidate skill slugs, and one duplicate candidate (`commando-hothead`) caused by duplicate preview files. Those filenames are useful for candidate skill-name discovery, but they are not enough by themselves to determine skill-tree tier positions, effect text, scaling values, or budget formulas.

Current game-file findings:

- English `Game.locres` contains localized skill names and detailed skill descriptions for 198 skill entries across the six current perks.
- Raw specialist skill tree assets (`SPEC_*_PassiveSkillTree.uasset`, `SPEC_*_GrenadeSkillTree.uasset`, and `SPEC_*_GadgetSkillTree.uasset`) expose tier grouping for the three skill trees every perk has: `passives`, `throwable`, and `gadget`.
- Current collection attaches unlock levels from `webapp/data/skill/level_requirement.json`; the exact game-file source for those level gates is still TODO to decode.
- Some raw tree entries such as `Capacity_Tier2`/`Capacity_Tier4` do not have localized skill descriptions and need manual review before being treated as selectable skill options.

## Workflow

### 1. Inventory local files

Use the repo tools to produce a safe inventory and reviewable skill candidate report:

```sh
node tools/kf3-data/inventory-game-files.mjs \
  --game-root "C:\Program Files (x86)\Steam\steamapps\common\Nightfall" \
  --out scratch/kf3-game-inventory.json

node tools/kf3-data/run-skill-collection.mjs
```

If local extracts are missing or stale, refresh them first and then rerun collection:

```sh
node tools/kf3-data/run-skill-collection.mjs --refresh-extracts
```

These outputs belong in `scratch/` and should not be committed.

### 2. Collect web candidates

Search official and community sources for:

- perk skill names and descriptions,
- skill category/tier positions,
- level requirements,
- proficiency entries,
- Operational Budget / Starting Money formulas or tables.

For each source, record URL, access date, and whether it is official, in-game, game-file-derived, or community. Community-only values should become provisional data with a visible UI note.

### 3. Investigate game files read-only

Use a read-only Unreal asset browser first, then automate only after asset paths are known.

Recommended first pass:

1. Open the install in FModel.
2. Use the KF3/UE mapping file (`.usmap`) if asset property names are otherwise unreadable.
3. Search for known skill-preview names from `scratch/kf3-game-inventory.json`.
4. Look for DataTables/DataAssets or localization tables containing perk skills, proficiency, level gates, and budget data.
5. Export candidate assets as JSON/property text into `scratch/fmodel-export/`.

If archives require keys or bypassing protections, stop and ask before proceeding. The project should use legitimate local files and public/allowed tools only.

### 4. Normalize exported data

After candidate FModel exports are available, run the collection tool against `scratch/fmodel-export/` to attach export evidence to preview-derived candidates:

```sh
node tools/kf3-data/collect-skill-candidates.mjs \
  --game-root "C:\Program Files (x86)\Steam\steamapps\common\Nightfall" \
  --fmodel-export-root scratch/fmodel-export \
  --out-dir scratch/skill-collection
```

After exact asset paths and export shapes are known, add a focused importer that reads those exports and produces normalized candidate perk JSON. The importer should not silently overwrite app data. It should emit candidate JSON plus a diff/report that a human can review before copying into `webapp/data/skill/`.

### 5. Validate before app use

Before normalized data reaches the simulator:

- ensure every production perk has a hand-authored globally unique `PerkSlug`,
- ensure every production skill has a hand-authored globally unique `SkillSlug`,
- validate category/tier counts against `webapp/data/skill/level_requirement.json`,
- verify placeholder interpolation values,
- flag missing icons and preview media as non-blocking,
- label provisional Operational Budget values until verified.

## Tooling plan

Keep tooling under `tools/kf3-data/`.

- `inventory-game-files.mjs` — safe local inventory of PAK/IoStore files and skill-preview filenames.
- `collect-skill-candidates.mjs` — collects reviewable skill candidates from preview filenames, optional English `Game.locres` CSV, optional raw skill-tree assets, and optional FModel text/JSON exports.
- `run-skill-collection.mjs` — simple rerun/refresh wrapper that can reuse current `scratch/` extracts or refresh local UEExtractor outputs before collecting.
- `ueextractor-helper/` — source for the local C# helper used to list/extract raw Unreal asset bytes with UEExtractor internals; compiled binaries remain local-only.
- `import-fmodel-export.mjs` — planned focused importer from known FModel DataTable/DataAsset exports to normalized candidate data.
- `validate-normalized-data.mjs` — planned validation script for slugs, tiers, and source notes.

The extraction seam should be narrow: given a game root or export root, produce candidate data and a report. The app should consume only reviewed normalized JSON, not raw game archives or large extractor outputs.

## Repo hygiene

Do not commit:

- raw `.pak`, `.ucas`, `.utoc`, `.uasset`, `.umap`, `.uexp`, `.ubulk`, or `.sig` files,
- bulk FModel exports,
- extracted videos or icons unless licensing/attribution is explicitly approved,
- local paths or machine-specific config files.

Commit only:

- normalized simulator data,
- small source manifests or notes,
- extraction/import scripts,
- human-readable reports when they are useful and legally safe.

## Open questions

- Exact game-file source for skill unlock level gates.
- How to parse scaling values from `SPEC_*_Skills_DT.uasset` / `SPEC_*_Skills_CT.uasset` without a `.usmap` mapping.
- Whether Operational Budget is stored as a formula, table, or derived from several values.
- Whether shared build payloads need a schema/data version marker before link sharing ships.
