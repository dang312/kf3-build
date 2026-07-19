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

- English `Game.locres` contains localized skill names and detailed skill descriptions for the numbered skill entries plus the unnumbered `ThrowableCapacity_*` capacity entries across the six current perks.
- Raw specialist skill tree assets (`SPEC_*_PassiveSkillTree.uasset`, `SPEC_*_GrenadeSkillTree.uasset`, and `SPEC_*_GadgetSkillTree.uasset`) expose tier grouping for the three skill trees every perk has: `passives`, `throwable`, and `gadget`.
- Current collection attaches unlock levels from `webapp/data/skill/level_requirement.json`; the exact game-file source for those level gates is still TODO to decode.
- Raw tree entries `Capacity_Tier2`/`Capacity_Tier4` map to the unnumbered local-game locres keys `ThrowableCapacity_SkillName_*` and `ThrowableCapacity_SkillDescription_*`; both tiers use the exact localized description `Throwable carrying capacity is increased by <sEmp>1</>.`.
- The game has a separate **Proficiency** system: `SPEC_*_Proficiency_DT.uasset` records per-perk inputs (`AlliesRevived`, `Kills`, `ToolsUsed`, and `WavesCompleted`) across Normal, Hard, and Hell on Earth; `Progression_SpentProficiency_DT.uasset` and its level-threshold companion provide the per-perk progression seam. `NF_Proficiency_WDGT.uasset` contains `Amount`, `Cost`, and `Slash` UI fields. This is **not evidence that a `0/3` displayed on a skill is Proficiency**.
- Local UI assets establish a three-rank skill cap: `NF_SkillButton_Content_WDGT.uasset` serializes `Rank1`, `Rank2`, and `Rank3`, while `NF_UpgradeModal_WDGT.uasset` serializes `MaxSkillRank`, `CURRENT SKILL RANK`, and `MAX RANK REACHED`. The normalized app rule lives in `webapp/data/skill/rank_rules.json` with those source paths.
- Manual parsing now pairs the local `SPEC_*_Skills_CT.uasset` curve tables with `SPEC_*_Skills_DT.uasset` conversion rules, yielding rank-0–3 placeholder arrays for 190 skills, including the equipped base effect. Each normalized skill keeps its curve/rule source metadata. Eight `MultiplyBy` entries still need their game-data baseline decoded, and exact per-rank proficiency costs remain unresolved; do not invent either value.

## Skill icon collection plan

Skill icons should be collected with the same reviewable, provenance-first workflow as skill names/descriptions. Reviewed, optimized skill icon images are allowed to be committed because this project supports the game; generated placeholder icons remain the fallback until real game-derived icons are found and promoted.

### Icon collection goals

- Discover the game asset path for each selectable `SkillOption` icon.
- Preserve source evidence for every icon candidate, even when the final image asset is not committed.
- Treat the game model as one icon per `SkillOption`, while still keeping `SkillSlug` as the stable selection/share identifier.
- Keep raw texture exports and bulk icon dumps out of git; commit only reviewed, optimized icon assets that are promoted for webapp use.
- Allow partial icon coverage during development; the webapp must gracefully fall back to generated placeholder icons for unresolved icons.

### Icon search inputs

Use the already collected skill candidates as the search seed:

- `scratch/skill-collection/skill-candidates.json` for `perkSlug`, `candidateSkillSlug`, display name, category, tier, raw tree asset, locres keys, and preview filenames.
- `scratch/raw-extract/` for raw `.uasset` strings and references around specialist skill tree assets.
- `scratch/fmodel-export/` or a dedicated `scratch/fmodel-icon-export/` for FModel text/JSON/texture exports.
- The local Nightfall install as a read-only source for package inventory.

### Icon search strategy

1. **Find metadata references before exporting images.**
   - Search FModel text/JSON exports for fields such as `Icon`, `SkillIcon`, `Image`, `Brush`, `Texture`, `Thumbnail`, `SlateBrush`, `SoftObjectPath`, and `AssetPath`.
   - Search with skill names, skill slugs, raw tree identifiers, locres keys, and specialist/perk names.
   - Prioritize DataTables/DataAssets that already bind skill rows to icon paths over filename-only matches.
2. **Scan likely UI and specialist asset paths.**
   - Inspect paths containing `UI`, `Icon`, `Icons`, `Skill`, `Skills`, `Texture`, `Textures`, `Widget`, `Specialist`, `Perk`, and the six specialist/perk names.
   - Include `Nightfall/Content/Characters/Specialists/**` because skill tree assets already live there.
   - Include shared UI folders because icons may be in an atlas or common HUD package rather than beside skill data.
3. **Parse raw asset references when structured exports are unavailable.**
   - Extract `/Game/...` soft-object-path-looking strings from relevant `.uasset` bytes.
   - Record nearby strings and the source asset path for review instead of guessing silently.
4. **Generate only matched candidate textures.**
   - After likely icon asset paths are known, export only those textures/materials to ignored scratch paths.
   - Do not require a visual review sheet; generate icons for high-confidence matches and emit a concise JSON/markdown summary for missing, ambiguous, or duplicate candidates.
5. **Promote only matched icon assets.**
   - Copy optimized, high-confidence matched icons to `webapp/static/skill-icons/{perkSlug}/{skillSlug}.webp` and set `SkillOption.icon` to the public path, for example `/skill-icons/commando/commando-hothead.webp`.
   - Normalize promoted icons to square `512x512` WebP assets, preserving transparency when possible. The current `SpecialistSkillIcons` sources are native 256px textures; upscale the generated silhouettes to 512px with high-quality resampling so browser-sized icons look less jagged without changing the near-match color. When extracted texture data is a mask rather than a finished browser-visible image, decode DXT5 color blocks with BC3 four-color interpolation and render the RGB glyph mask as a high-contrast off-white silhouette so promoted icons are visible and comparable to the in-game skill UI.
   - Promote icon source metadata under each skill's source record so every committed icon remains traceable to its game-file source.

### Planned icon tooling

Add one focused command under `tools/kf3-data/`:

- `generate-skill-icons.mjs` — reads the current skill candidate JSON, scans FModel/text/raw exports for icon references, generates high-confidence icon outputs, copies optimized `512x512` WebP files into `webapp/static/skill-icons/{perkSlug}/{skillSlug}.webp`, and updates `webapp/data/skill/character/*.json` with `icon` paths plus icon source metadata without overwriting skill text/tier data.

The command should overwrite existing generated icon files and promoted icon metadata by default so reruns are reproducible after game patches. It can add an explicit `--preserve-existing` option later if manual overrides become necessary. Defaults should be:

```sh
node tools/kf3-data/generate-skill-icons.mjs
```

- skill candidates: `scratch/skill-collection/skill-candidates.json`
- raw extracts: `scratch/raw-extract/`
- FModel/icon exports: `scratch/fmodel-icon-export/`, falling back to `scratch/fmodel-export/`
- webapp skill data: `webapp/data/skill/character/`
- output icons: `webapp/static/skill-icons/`
- scratch report: `scratch/skill-icon-collection/`

Optional flags should include `--skill-candidates`, `--raw-extract-root`, `--fmodel-export-root`, `--webapp-skill-dir`, `--icon-out-root`, and `--scratch-out-dir`.

The command should still keep collection and promotion phases internally visible in its log/report because it reads scratch/game-derived inputs and mutates tracked webapp files. It should write concise JSON/markdown summaries under `scratch/skill-icon-collection/` for generated, missing, ambiguous, or duplicate candidates.

Candidate output should preserve enough detail for audit, for example:

```json
{
  "skillSlug": "commando-hothead",
  "perkSlug": "commando",
  "skillName": "Hothead",
  "category": "passives",
  "tierNumber": 1,
  "candidates": [
    {
      "confidence": "high",
      "matchedBy": ["skill-row-icon-field"],
      "gameAssetPath": "/Game/.../T_UI_Skill_Hothead",
      "sourceFile": "scratch/fmodel-icon-export/...",
      "exportedPreviewPath": "scratch/skill-icon-collection/previews/commando-hothead.png",
      "notes": "Direct icon field on skill row"
    }
  ]
}
```

### Icon validation checklist

Before icon data reaches the simulator:

- no raw package, `.uasset`, bulk texture export, or unreviewed icon dump is committed,
- every promoted icon path uses `webapp/static/skill-icons/{perkSlug}/{skillSlug}.webp` and exists in the app,
- every promoted `SkillOption.icon` uses the matching public path `/skill-icons/{perkSlug}/{skillSlug}.webp`,
- every promoted icon/source record has the game asset path and collection method,
- duplicate exported images are identified by hash and reported as warnings because the expected model is one icon per skill,
- missing icons are reported but do not fail promotion during development,
- reviewed icons are optimized as square `512x512` WebP assets before commit,
- the UI still works when a skill has no real icon.

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
- `generate-skill-icons.mjs` — planned single-command icon generation and promotion path for high-confidence `SkillOption.icon` assets and icon source metadata.
- `validate-normalized-data.mjs` — planned validation script for slugs, tiers, icon references, and source notes.

The extraction seam should be narrow: given a game root or export root, produce candidate data and a report. The app should consume only reviewed normalized JSON, not raw game archives or large extractor outputs.

## Repo hygiene

Do not commit:

- raw `.pak`, `.ucas`, `.utoc`, `.uasset`, `.umap`, `.uexp`, `.ubulk`, or `.sig` files,
- bulk FModel exports,
- extracted videos or unreviewed bulk icon dumps,
- local paths or machine-specific config files.

Commit only:

- normalized simulator data,
- reviewed, optimized skill icon assets promoted for webapp use,
- small source manifests or notes,
- extraction/import scripts,
- human-readable reports when they are useful and legally safe.

## Open questions

- Exact game-file source for skill unlock level gates.
- Proficiency rank caps, costs, and level thresholds from `SPEC_*_Proficiency_DT.uasset` / `Progression_SpentProficiency_DT.uasset`.
- Per-skill point caps, costs, and scaling arrays from `SPEC_*_Skills_DT.uasset` / `SPEC_*_Skills_CT.uasset` without a `.usmap` mapping.
- Whether Operational Budget is stored as a formula, table, or derived from several values.
- Whether skill icons are stored as direct per-skill texture references, shared icon atlases, material instances, or widget brushes.
- Whether shared build payloads need a schema/data version marker before link sharing ships.
