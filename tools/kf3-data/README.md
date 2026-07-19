# KF3 Data Tools

Tools in this directory collect reviewable KF3 skill data for the simulator. Raw game extracts stay in ignored `scratch/` or local temp folders; only tool source and reviewed normalized data should be committed.

## Simple rerun

From the repo root:

```sh
node tools/kf3-data/run-skill-collection.mjs
```

This reuses the current ignored extracts in `scratch/` and writes:

- `scratch/skill-collection/skill-candidates.json`
- `scratch/skill-collection/skill-candidates.md`

## Promote the current collection into the webapp

After reviewing or regenerating the collector output, copy it into tracked webapp data with:

```sh
node tools/kf3-data/promote-skill-candidates-to-webapp.mjs
```

This replaces `webapp/data/skill/character/*.json`, writes `webapp/data/skill/perk_registry.json`, and copies the full source collection/report into `webapp/data/skill/source/`. The per-perk skill files keep source metadata on each skill so later webapp work can trace preview files, locres keys, raw skill-tree assets, collection status, and collector notes.

Current collection enrichment uses:

- skill preview filenames from the local Nightfall install,
- English `Game.locres` CSV at `scratch/locres-game-en/Game.csv` for skill names/descriptions,
- raw extracted `SPEC_*_{Passive,Grenade,Gadget}SkillTree.uasset` files under `scratch/raw-extract/` for tier grouping,
- `webapp/data/skill/level_requirement.json` for unlock levels until the game-file source for those gates is decoded.

Every perk is expected to have exactly three skill trees: `passives`, `throwable`, and `gadget`.

## Generate and promote skill icons

After skill candidates have been collected/promoted, generate real skill icons from local game files with one command:

```sh
node tools/kf3-data/generate-skill-icons.mjs
```

This scans the local game asset list for high-confidence `SpecialistSkillIcons` matches, extracts the matched texture assets, decodes their mask-style texture data, decodes DXT5 color blocks using the four-color BC3 path, converts the RGB glyph mask into a hard-edged high-contrast off-white in-game-style silhouette, upscales from the native 256px texture to optimized `512x512` WebP icons for smoother browser display, writes them to `webapp/static/skill-icons/{perkSlug}/{skillSlug}.webp`, and updates `webapp/data/skill/character/*.json` with `icon` paths plus icon source metadata. Existing generated icons and promoted icon metadata are overwritten by default so reruns are reproducible after game patches. The command uses the webapp's `sharp` dev dependency, so run `npx --yes pnpm@10.14.0 install --frozen-lockfile` in `webapp/` first if dependencies are missing.

The command writes a concise report to:

- `scratch/skill-icon-collection/skill-icons.json`
- `scratch/skill-icon-collection/skill-icons.md`

Raw texture extracts stay in local/ignored scratch locations; only reviewed generated web icons should be committed.

## Refresh extracts, then rerun

If the local extracts are missing or stale, use:

```sh
node tools/kf3-data/run-skill-collection.mjs --refresh-extracts
```

The refresh path expects local-only UEExtractor setup under `C:\Temp\kf3-build-tools`:

- `ueextractor/UEExtractor.exe`
- `ueextractor-helper/UeExtractorHelper.dll`
- `aes-dump-input/aes.txt`

Those binaries/key files are intentionally not committed. The helper source is committed at `tools/kf3-data/ueextractor-helper/` so it can be rebuilt locally.

To rebuild the helper when a .NET SDK is available:

```sh
dotnet build tools/kf3-data/ueextractor-helper/UeExtractorHelper.csproj \
  -c Release \
  -o /mnt/c/Temp/kf3-build-tools/ueextractor-helper \
  /p:UeExtractorDir=/mnt/c/Temp/kf3-build-tools/ueextractor
```

## Inventory the local game install

```sh
node tools/kf3-data/inventory-game-files.mjs \
  --game-root "/mnt/c/Program Files (x86)/Steam/steamapps/common/Nightfall" \
  --out scratch/kf3-game-inventory.json
```

You can also pass the Windows path; the script converts `C:\...` to `/mnt/c/...` when running under WSL/Linux.

## Lower-level candidate collection

`run-skill-collection.mjs` wraps this command, but it can be run directly:

```sh
node tools/kf3-data/collect-skill-candidates.mjs \
  --game-root "/mnt/c/Program Files (x86)/Steam/steamapps/common/Nightfall" \
  --locres-game-csv scratch/locres-game-en/Game.csv \
  --raw-extract-root scratch/raw-extract \
  --no-fmodel \
  --out-dir scratch/skill-collection
```

If you have FModel text/JSON exports in another folder, add:

```sh
--fmodel-export-root scratch/fmodel-export
```

## Notes

- UEExtractor archive mounting has been nondeterministic for this game; `run-skill-collection.mjs --refresh-extracts` retries extraction attempts.
- Missing descriptions indicate skills whose localization key/name does not match the tree reference; review before normalizing into app data. Capacity-tier descriptions are collected from the unnumbered `ThrowableCapacity_*` locres keys.
- Do not commit raw `.pak`, `.ucas`, `.utoc`, `.uasset`, `.umap`, `.uexp`, `.ubulk`, `.sig`, extracted videos, AES keys, or bulk extractor output.
