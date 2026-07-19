#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { DEFAULT_WINDOWS_ROOT, exists } from "./lib/game-inventory.mjs";

const DEFAULT_SKILL_CANDIDATES =
  "scratch/skill-collection/skill-candidates.json";
const DEFAULT_RAW_EXTRACT_ROOT = "scratch/raw-extract";
const DEFAULT_FMODEL_ICON_EXPORT_ROOT = "scratch/fmodel-icon-export";
const DEFAULT_FMODEL_EXPORT_ROOT = "scratch/fmodel-export";
const DEFAULT_WEBAPP_SKILL_DIR = "webapp/data/skill/character";
const DEFAULT_ICON_OUT_ROOT = "webapp/static/skill-icons";
const DEFAULT_SCRATCH_OUT_DIR = "scratch/skill-icon-collection";
const DEFAULT_WORK_ROOT = "C:\\Temp\\kf3-build-tools";
const DEFAULT_ENGINE_VERSION = "UE5_4";
const DEFAULT_MAX_ATTEMPTS = 5;
const ICON_FILTER = "SpecialistSkillIcons";
const OUTPUT_SIZE = 512;
const SKILL_CATEGORIES = ["passives", "throwable", "gadget"];

const PERK_ICON_FOLDER = {
  commando: "CommandoSkillIcons",
  engineer: "EngineerSkillIcons",
  firebug: "FirebugSkillIcons",
  medic: "MedicSkillIcons",
  ninja: "NinjaSkillIcons",
  sharpshooter: "SharpshooterSkillIcons",
};

const CATEGORY_ICON_FOLDERS = {
  passives: ["Passive", "Passives"],
  throwable: ["Throwable"],
  gadget: ["Gadget"],
};

const ICON_STEM_PREFIXES = [
  "comskill",
  "engskill",
  "fireskill",
  "medskill",
  "ninskill",
  "shrpskill",
];

const KNOWN_ICON_ALIASES = new Map([
  ["commando:commando-time-and-again", "timeandtimeagain"],
  ["ninja:ninja-violent-sorcerer", "violentsorceror"],
]);

function parseArgs(argv) {
  const args = {
    gameRoot: process.env.KF3_GAME_ROOT ?? DEFAULT_WINDOWS_ROOT,
    skillCandidates: DEFAULT_SKILL_CANDIDATES,
    rawExtractRoot: DEFAULT_RAW_EXTRACT_ROOT,
    fmodelExportRoot: undefined,
    webappSkillDir: DEFAULT_WEBAPP_SKILL_DIR,
    iconOutRoot: DEFAULT_ICON_OUT_ROOT,
    scratchOutDir: DEFAULT_SCRATCH_OUT_DIR,
    workRoot: DEFAULT_WORK_ROOT,
    engineVersion: DEFAULT_ENGINE_VERSION,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    preserveExisting: false,
    listOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--game-root") {
      args.gameRoot = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--skill-candidates") {
      args.skillCandidates = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--raw-extract-root") {
      args.rawExtractRoot = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--fmodel-export-root") {
      args.fmodelExportRoot = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--webapp-skill-dir") {
      args.webappSkillDir = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--icon-out-root") {
      args.iconOutRoot = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--scratch-out-dir") {
      args.scratchOutDir = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--work-root") {
      args.workRoot = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--ueextractor-dir") {
      args.ueextractorDir = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--helper-dll") {
      args.helperDll = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--aes-file") {
      args.aesFile = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--dotnet-exe") {
      args.dotnetExe = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--engine-version") {
      args.engineVersion = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--max-attempts") {
      args.maxAttempts = parsePositiveInteger(
        requiredValue(argv, index, arg),
        arg,
      );
      index += 1;
    } else if (arg === "--preserve-existing") {
      args.preserveExisting = true;
    } else if (arg === "--list-only") {
      args.listOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  args.ueextractorDir ??= pathJoinWindows(args.workRoot, "ueextractor");
  args.helperDll ??= pathJoinWindows(
    args.workRoot,
    "ueextractor-helper",
    "UeExtractorHelper.dll",
  );
  args.aesFile ??= pathJoinWindows(args.workRoot, "aes-dump-input", "aes.txt");
  args.dotnetExe ??= "C:\\Program Files\\dotnet\\dotnet.exe";
  args.fmodelExportRoot ??= existsSync(DEFAULT_FMODEL_ICON_EXPORT_ROOT)
    ? DEFAULT_FMODEL_ICON_EXPORT_ROOT
    : DEFAULT_FMODEL_EXPORT_ROOT;
  return args;
}

function requiredValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
  return value;
}

function parsePositiveInteger(value, arg) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${arg} must be a positive integer`);
  }
  return parsed;
}

function existsSync(filePath) {
  try {
    return statSync(filePath).isDirectory() || statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function statSync(filePath) {
  return requireFs().statSync(filePath);
}

let fsModule;
function requireFs() {
  fsModule ??= createRequire(import.meta.url)("node:fs");
  return fsModule;
}

function printHelp() {
  console.log(
    `Usage: node tools/kf3-data/generate-skill-icons.mjs [options]\n\nGenerates and promotes high-confidence KF3 skill icons. It reads current skill candidates and webapp skill JSON, extracts SpecialistSkillIcons from the local game archives with the UEExtractor helper, decodes PF_DXT5/PF_B8G8R8A8 texture assets, writes 512x512 WebP files, updates SkillOption.icon, and writes a concise scratch report.\n\nDefault run:\n  node tools/kf3-data/generate-skill-icons.mjs\n\nOptions:\n  --game-root PATH           KF3/Nightfall install root. Defaults to KF3_GAME_ROOT or ${DEFAULT_WINDOWS_ROOT}\n  --skill-candidates PATH    Skill candidate JSON. Defaults to ${DEFAULT_SKILL_CANDIDATES}\n  --raw-extract-root PATH    Existing raw extract root for provenance notes. Defaults to ${DEFAULT_RAW_EXTRACT_ROOT}\n  --fmodel-export-root PATH  Optional FModel/icon export root for provenance notes. Defaults to ${DEFAULT_FMODEL_ICON_EXPORT_ROOT}, then ${DEFAULT_FMODEL_EXPORT_ROOT}\n  --webapp-skill-dir PATH    Webapp perk JSON directory. Defaults to ${DEFAULT_WEBAPP_SKILL_DIR}\n  --icon-out-root PATH       Promoted icon output directory. Defaults to ${DEFAULT_ICON_OUT_ROOT}\n  --scratch-out-dir PATH     Scratch report/output directory. Defaults to ${DEFAULT_SCRATCH_OUT_DIR}\n  --work-root PATH           Windows work root for UEExtractor tooling. Defaults to ${DEFAULT_WORK_ROOT}\n  --ueextractor-dir PATH     Windows UEExtractor folder. Defaults to <work-root>\\ueextractor\n  --helper-dll PATH          Windows UeExtractorHelper.dll path. Defaults to <work-root>\\ueextractor-helper\\UeExtractorHelper.dll\n  --aes-file PATH            Windows AES key file. Defaults to <work-root>\\aes-dump-input\\aes.txt\n  --dotnet-exe PATH          Windows dotnet.exe path. Defaults to C:\\Program Files\\dotnet\\dotnet.exe\n  --engine-version VALUE     UEExtractor/CUE4Parse engine version. Defaults to ${DEFAULT_ENGINE_VERSION}\n  --max-attempts N           Retry count for nondeterministic archive mounting. Defaults to ${DEFAULT_MAX_ATTEMPTS}\n  --preserve-existing        Do not overwrite existing icon files or promoted icon metadata. Default is overwrite.\n  --list-only                Write reports without promoting icons or editing webapp JSON.`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.scratchOutDir, { recursive: true });
  const candidates = await loadPlacedSkillCandidates(args.skillCandidates);
  const iconAssets = await collectIconAssetPaths(args);
  const matches = matchIconAssets(candidates, iconAssets);
  const extractedRoot = await extractIconAssets(args);
  const sharp = await loadSharp(args.webappSkillDir);
  const generation = await generateIcons({
    args,
    matches,
    extractedRoot,
    sharp,
  });
  const promotion = args.listOnly
    ? { updatedSkillFiles: [], promotedSkills: [] }
    : await promoteIconsToWebapp(args, generation.generated, matches.missing);
  const duplicateHashes = findDuplicateHashes(generation.generated);
  const report = {
    generatedAt: new Date().toISOString(),
    inputs: {
      gameRoot: toWindowsPath(args.gameRoot),
      skillCandidates: args.skillCandidates,
      rawExtractRoot: args.rawExtractRoot,
      fmodelExportRoot: args.fmodelExportRoot,
      webappSkillDir: args.webappSkillDir,
      iconOutRoot: args.iconOutRoot,
      scratchOutDir: args.scratchOutDir,
    },
    summary: {
      candidateSkillCount: candidates.length,
      iconAssetCount: iconAssets.length,
      matchedIconCount: matches.matched.length,
      ambiguousIconCount: matches.ambiguous.length,
      missingIconCount: matches.missing.length,
      generatedIconCount: generation.generated.length,
      failedIconCount: generation.failed.length,
      duplicateHashCount: duplicateHashes.length,
      updatedSkillFiles: promotion.updatedSkillFiles.length,
    },
    matched: matches.matched,
    missing: matches.missing,
    ambiguous: matches.ambiguous,
    generated: generation.generated,
    failed: generation.failed,
    duplicateHashes,
    updatedSkillFiles: promotion.updatedSkillFiles,
  };
  await writeReports(args.scratchOutDir, report);
  printSummary(report, args.listOnly);
}

async function loadPlacedSkillCandidates(skillCandidatesPath) {
  const collection = JSON.parse(await readFile(skillCandidatesPath, "utf8"));
  return collection.perks
    .flatMap((perk) => perk.skills)
    .filter(
      (skill) => skill.category && skill.tierNumber && skill.candidateSkillSlug,
    )
    .sort((left, right) =>
      left.candidateSkillSlug.localeCompare(right.candidateSkillSlug),
    );
}

async function collectIconAssetPaths(args) {
  const allAssetsPath = path.join(args.scratchOutDir, "all-assets.txt");
  if (process.platform === "win32") {
    throw new Error(
      "generate-skill-icons.mjs currently expects WSL/Linux with powershell.exe available.",
    );
  }
  ensureWindowsToolingAvailable();
  await assertWindowsFileExists(
    pathJoinWindows(args.ueextractorDir, "UEExtractor.exe"),
    "UEExtractor.exe",
  );
  await assertWindowsFileExists(args.helperDll, "UeExtractorHelper.dll");
  await assertWindowsFileExists(args.aesFile, "AES key file");
  await prepareScratchRoot({
    gameRoot: toWindowsPath(args.gameRoot),
    scratchRoot: pathJoinWindows(args.workRoot, "nightfall-scratch-root"),
    aesFile: args.aesFile,
  });

  let output = "";
  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    const command = `
$ErrorActionPreference = 'Continue'
Set-Location ${psQuote(args.ueextractorDir)}
& ${psQuote(args.dotnetExe)} ${psQuote(args.helperDll)} --mode list --game-root ${psQuote(pathJoinWindows(args.workRoot, "nightfall-scratch-root"))} --version ${psQuote(args.engineVersion)} --aes-file ${psQuote(args.aesFile)}
exit $LASTEXITCODE
`;
    const result = runPowerShell(
      command,
      `list game assets attempt ${attempt}`,
      { allowFailure: true },
    );
    output = result.output;
    if (
      result.status === 0 &&
      /Provider initialized\. Found 206398 virtual files\./.test(output)
    ) {
      break;
    }
    if (attempt === args.maxAttempts) {
      throw new Error(
        `Failed to list game assets after ${args.maxAttempts} attempt(s). Last exit: ${result.status}`,
      );
    }
    console.warn(
      `Asset listing attempt ${attempt} did not mount useful files; retrying.`,
    );
  }
  await writeFile(allAssetsPath, output, "utf8");
  return output
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.includes("/UI/NightfallUI/Textures/SpecialistSkillIcons/") &&
        line.endsWith(".uasset"),
    )
    .sort((left, right) => left.localeCompare(right));
}

async function extractIconAssets(args) {
  const scratchRoot = pathJoinWindows(args.workRoot, "nightfall-scratch-root");
  const workIconExtractRoot = pathJoinWindows(
    args.workRoot,
    "skill-icon-raw-extract",
  );
  await rm(windowsToLocalPath(workIconExtractRoot), {
    recursive: true,
    force: true,
  });
  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    const command = `
$ErrorActionPreference = 'Continue'
Set-Location ${psQuote(args.ueextractorDir)}
& ${psQuote(args.dotnetExe)} ${psQuote(args.helperDll)} --mode extract-filter --game-root ${psQuote(scratchRoot)} --version ${psQuote(args.engineVersion)} --aes-file ${psQuote(args.aesFile)} --filter ${psQuote(ICON_FILTER)} --out-dir ${psQuote(workIconExtractRoot)}
exit $LASTEXITCODE
`;
    const result = runPowerShell(
      command,
      `extract ${ICON_FILTER} attempt ${attempt}`,
      {
        allowFailure: true,
      },
    );
    if (
      /Provider initialized\. Found 206398 virtual files\./.test(
        result.output,
      ) &&
      /Extracted [1-9]\d* file\(s\)\./.test(result.output)
    ) {
      await writeFile(
        path.join(args.scratchOutDir, "extract.log"),
        result.output,
        "utf8",
      );
      return windowsToLocalPath(workIconExtractRoot);
    }
    console.warn(
      `${ICON_FILTER} extraction attempt ${attempt} did not mount/extract useful files.`,
    );
    if (attempt === args.maxAttempts) {
      throw new Error(
        `Failed ${ICON_FILTER} extraction after ${args.maxAttempts} attempt(s).`,
      );
    }
  }
  throw new Error(`Failed ${ICON_FILTER} extraction.`);
}

function matchIconAssets(candidates, iconAssets) {
  const matched = [];
  const missing = [];
  const ambiguous = [];
  for (const candidate of candidates) {
    const assetPool = iconAssets.filter((assetPath) =>
      iconAssetAppliesToCandidate(assetPath, candidate),
    );
    const match = findBestIconMatch(candidate, assetPool);
    if (match.kind === "matched") {
      matched.push(match.entry);
    } else if (match.kind === "ambiguous") {
      ambiguous.push(match.entry);
    } else {
      missing.push({
        perkSlug: candidate.perkSlug,
        skillSlug: candidate.candidateSkillSlug,
        skillName: candidate.candidateSkillName,
        category: candidate.category,
        tierNumber: candidate.tierNumber,
        searchedIconKeys: match.searchedIconKeys,
        candidateAssetCount: assetPool.length,
      });
    }
  }
  return { matched, missing, ambiguous };
}

function iconAssetAppliesToCandidate(assetPath, candidate) {
  const perkFolder = PERK_ICON_FOLDER[candidate.perkSlug];
  const categoryFolders = CATEGORY_ICON_FOLDERS[candidate.category] ?? [];
  return (
    perkFolder !== undefined &&
    assetPath.includes(`/${perkFolder}/`) &&
    categoryFolders.some((categoryFolder) =>
      assetPath.includes(`/${categoryFolder}/`),
    )
  );
}

function findBestIconMatch(candidate, assetPool) {
  const keyAttempts = createIconKeyAttempts(
    candidate,
    assetPool.map(iconKeyFromAssetPath),
  );
  for (const attempt of keyAttempts) {
    const hits = assetPool.filter(
      (assetPath) => iconKeyFromAssetPath(assetPath) === attempt.key,
    );
    if (hits.length === 1) {
      return {
        kind: "matched",
        entry: createMatchedEntry(candidate, hits[0], attempt),
      };
    }
    if (hits.length > 1) {
      return {
        kind: "ambiguous",
        entry: {
          perkSlug: candidate.perkSlug,
          skillSlug: candidate.candidateSkillSlug,
          skillName: candidate.candidateSkillName,
          category: candidate.category,
          tierNumber: candidate.tierNumber,
          searchedIconKey: attempt.key,
          matchedBy: attempt.matchedBy,
          assetPaths: hits,
        },
      };
    }
  }
  return {
    kind: "missing",
    searchedIconKeys: keyAttempts.map((attempt) => attempt.key),
  };
}

function createIconKeyAttempts(candidate, availableKeys) {
  const attempts = [];
  const add = (key, matchedBy) => {
    if (!key || attempts.some((attempt) => attempt.key === key)) {
      return;
    }
    attempts.push({ key, matchedBy });
  };

  const aliasKey = KNOWN_ICON_ALIASES.get(
    `${candidate.perkSlug}:${candidate.candidateSkillSlug}`,
  );
  add(aliasKey, "known-icon-alias");

  if (/capacity-tier[24]$/i.test(candidate.candidateSkillSlug)) {
    add(capacityIconKey(candidate, availableKeys), "capacity-tier-icon-name");
  }

  add(
    normalizeIconKey(
      candidate.candidateSkillSlug.replace(`${candidate.perkSlug}-`, ""),
    ),
    "exact-skill-slug-tail",
  );
  add(normalizeIconKey(candidate.candidateSkillName), "exact-skill-name");
  add(normalizeIconKey(candidate.internalName), "exact-internal-name");
  return attempts;
}

function capacityIconKey(candidate, availableKeys) {
  const preferred =
    candidate.tierNumber === 2
      ? ["capacityup01", "capacityup", "capacity"]
      : ["capacityup02", "capacityup2"];
  return preferred.find((key) => availableKeys.includes(key)) ?? preferred[0];
}

function createMatchedEntry(candidate, assetPath, attempt) {
  const publicPath = `/skill-icons/${candidate.perkSlug}/${candidate.candidateSkillSlug}.webp`;
  return {
    perkSlug: candidate.perkSlug,
    skillSlug: candidate.candidateSkillSlug,
    skillName: candidate.candidateSkillName,
    category: candidate.category,
    tierNumber: candidate.tierNumber,
    internalName: candidate.internalName,
    confidence: "high",
    matchedBy: attempt.matchedBy,
    matchedIconKey: attempt.key,
    gameAssetPath: assetPath,
    iconAssetName: path.basename(assetPath, ".uasset"),
    publicPath,
    outputPath: path.join("webapp/static", publicPath),
  };
}

function iconKeyFromAssetPath(assetPath) {
  let key = normalizeIconKey(path.basename(assetPath, ".uasset"));
  for (const prefix of ICON_STEM_PREFIXES) {
    if (key.startsWith(prefix)) {
      key = key.slice(prefix.length);
      break;
    }
  }
  return key;
}

function normalizeIconKey(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function loadSharp(webappSkillDir) {
  const packagePath = path.resolve(
    webappSkillDir,
    "..",
    "..",
    "..",
    "package.json",
  );
  try {
    const requireFromWebapp = createRequire(packagePath);
    return requireFromWebapp("sharp");
  } catch (error) {
    throw new Error(
      `sharp is required to write WebP skill icons. Install webapp dependencies first. Cause: ${error.message}`,
    );
  }
}

async function generateIcons({ args, matches, extractedRoot, sharp }) {
  const generated = [];
  const failed = [];
  if (!args.listOnly && !args.preserveExisting) {
    await rm(args.iconOutRoot, { recursive: true, force: true });
  }
  for (const match of matches.matched) {
    const localAssetPath = path.join(
      extractedRoot,
      ...match.gameAssetPath.split("/"),
    );
    try {
      const assetBytes = await readFile(localAssetPath);
      const decoded = decodeTextureAsset(assetBytes);
      const rendered = renderDecodedTextureAsUiIcon(decoded);
      const outputPath = path.join(
        args.iconOutRoot,
        match.perkSlug,
        `${match.skillSlug}.webp`,
      );
      if (
        !args.listOnly &&
        !(args.preserveExisting && (await exists(outputPath)))
      ) {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await sharp(rendered.rgba, {
          raw: { width: decoded.width, height: decoded.height, channels: 4 },
        })
          .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "fill", kernel: "lanczos3" })
          .webp({ lossless: true, quality: 95 })
          .toFile(outputPath);
      }
      const hash =
        !args.listOnly && (await exists(outputPath))
          ? sha256(await readFile(outputPath))
          : sha256(assetBytes);
      generated.push({
        ...match,
        outputPath,
        publicPath: `/skill-icons/${match.perkSlug}/${match.skillSlug}.webp`,
        sourceTexture: {
          pixelFormat: decoded.pixelFormat,
          width: decoded.width,
          height: decoded.height,
        },
        rendering: rendered.rendering,
        output: {
          format: "webp",
          width: OUTPUT_SIZE,
          height: OUTPUT_SIZE,
          sha256: hash,
        },
      });
    } catch (error) {
      failed.push({
        ...match,
        localAssetPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { generated, failed };
}

function renderDecodedTextureAsUiIcon(decoded) {
  const width = decoded.width;
  const height = decoded.height;
  const sourceMask = buildBinaryIconMask(decoded.rgba);
  const expandedMask = expandBinaryIconMask(sourceMask, width, height, 1);
  const rgba = Buffer.alloc(decoded.rgba.length);

  for (let pixelIndex = 0; pixelIndex < sourceMask.length; pixelIndex += 1) {
    const isCorePixel = sourceMask[pixelIndex] === 1;
    const isOutlinePixel = !isCorePixel && expandedMask[pixelIndex] === 1;
    if (!isCorePixel && !isOutlinePixel) {
      continue;
    }

    const offset = pixelIndex * 4;
    const [red, green, blue] = isCorePixel
      ? CORE_GLYPH_COLOR
      : OUTLINE_GLYPH_COLOR;
    rgba[offset] = red;
    rgba[offset + 1] = green;
    rgba[offset + 2] = blue;
    rgba[offset + 3] = 255;
  }

  return {
    rgba,
    rendering: {
      method: "rgb-mask-ingame-silhouette",
      note: "KF3 skill icon textures store the crisp in-game glyph in the RGB mask channels; generated WebP files threshold that mask into a high-contrast off-white silhouette with a hard one-pixel cool outline, then upscale from the native 256px texture to 512px with high-quality resampling so browser-sized icons keep the near-match color without looking blocky.",
    },
  };
}

const CORE_GLYPH_COLOR = [245, 244, 232];
const OUTLINE_GLYPH_COLOR = [54, 69, 82];
const RGB_MASK_THRESHOLD = 0.11;

function buildBinaryIconMask(rgba) {
  const mask = new Uint8Array(rgba.length / 4);
  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const sourceRed = rgba[offset];
    const sourceGreen = rgba[offset + 1];
    const sourceBlue = rgba[offset + 2];
    const sourceMaskValue = Math.max(sourceRed, sourceGreen, sourceBlue) / 255;
    mask[pixelIndex] = sourceMaskValue > RGB_MASK_THRESHOLD ? 1 : 0;
  }
  return mask;
}

function expandBinaryIconMask(mask, width, height, radius) {
  const expanded = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const outputIndex = y * width + x;
      if (mask[outputIndex] === 1) {
        expanded[outputIndex] = 1;
        continue;
      }

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        const sampleY = y + offsetY;
        if (sampleY < 0 || sampleY >= height) {
          continue;
        }
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = x + offsetX;
          if (sampleX < 0 || sampleX >= width) {
            continue;
          }
          const distance = Math.hypot(offsetX, offsetY);
          if (distance > radius) {
            continue;
          }
          if (mask[sampleY * width + sampleX] === 1) {
            expanded[outputIndex] = 1;
            break;
          }
        }
        if (expanded[outputIndex] === 1) {
          break;
        }
      }
    }
  }
  return expanded;
}

function decodeTextureAsset(bytes) {
  const text = bytes.toString("latin1");
  if (text.includes("PF_DXT5")) {
    const size = inferSquareTextureSize(bytes.length, 1);
    const compressedBytes = size * size;
    const compressed = bytes.subarray(bytes.length - compressedBytes);
    return {
      pixelFormat: "PF_DXT5",
      width: size,
      height: size,
      rgba: decodeBc3Dxt5(compressed, size, size),
    };
  }
  if (text.includes("PF_B8G8R8A8")) {
    const size = inferSquareTextureSize(bytes.length, 4);
    const rawBytes = size * size * 4;
    const bgra = bytes.subarray(bytes.length - rawBytes);
    return {
      pixelFormat: "PF_B8G8R8A8",
      width: size,
      height: size,
      rgba: bgraToRgba(bgra),
    };
  }
  throw new Error(
    "Unsupported texture pixel format; expected PF_DXT5 or PF_B8G8R8A8",
  );
}

function inferSquareTextureSize(byteLength, bytesPerPixelEquivalent) {
  const maxSize = 2048;
  for (let size = maxSize; size >= 16; size /= 2) {
    const requiredBytes = size * size * bytesPerPixelEquivalent;
    if (requiredBytes <= byteLength) {
      return size;
    }
  }
  throw new Error(
    `Could not infer square texture size from ${byteLength} byte asset`,
  );
}

function decodeBc3Dxt5(data, width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  const blockWidth = Math.ceil(width / 4);
  const blockHeight = Math.ceil(height / 4);
  for (let blockY = 0; blockY < blockHeight; blockY += 1) {
    for (let blockX = 0; blockX < blockWidth; blockX += 1) {
      const offset = (blockY * blockWidth + blockX) * 16;
      decodeBc3Block(data, offset, rgba, width, height, blockX, blockY);
    }
  }
  return rgba;
}

function decodeBc3Block(data, offset, rgba, width, height, blockX, blockY) {
  const alpha0 = data[offset];
  const alpha1 = data[offset + 1];
  const alphas = buildAlphaPalette(alpha0, alpha1);
  let alphaBits = 0n;
  for (let byteIndex = 0; byteIndex < 6; byteIndex += 1) {
    alphaBits |= BigInt(data[offset + 2 + byteIndex]) << BigInt(byteIndex * 8);
  }

  const color0 = data.readUInt16LE(offset + 8);
  const color1 = data.readUInt16LE(offset + 10);
  const colorBits = data.readUInt32LE(offset + 12);
  const colors = buildColorPalette(color0, color1);

  for (let pixelY = 0; pixelY < 4; pixelY += 1) {
    for (let pixelX = 0; pixelX < 4; pixelX += 1) {
      const x = blockX * 4 + pixelX;
      const y = blockY * 4 + pixelY;
      if (x >= width || y >= height) {
        continue;
      }
      const pixelIndex = pixelY * 4 + pixelX;
      const alphaIndex = Number((alphaBits >> BigInt(pixelIndex * 3)) & 0x7n);
      const colorIndex = (colorBits >> (pixelIndex * 2)) & 0x3;
      const [red, green, blue] = colors[colorIndex];
      const outputOffset = (y * width + x) * 4;
      rgba[outputOffset] = red;
      rgba[outputOffset + 1] = green;
      rgba[outputOffset + 2] = blue;
      rgba[outputOffset + 3] = alphas[alphaIndex];
    }
  }
}

function buildAlphaPalette(alpha0, alpha1) {
  const alphas = [alpha0, alpha1];
  if (alpha0 > alpha1) {
    for (let index = 1; index <= 6; index += 1) {
      alphas.push(Math.floor(((7 - index) * alpha0 + index * alpha1) / 7));
    }
  } else {
    for (let index = 1; index <= 4; index += 1) {
      alphas.push(Math.floor(((5 - index) * alpha0 + index * alpha1) / 5));
    }
    alphas.push(0, 255);
  }
  return alphas;
}

function buildColorPalette(color0, color1) {
  const [red0, green0, blue0] = decodeRgb565(color0);
  const [red1, green1, blue1] = decodeRgb565(color1);
  return [
    [red0, green0, blue0],
    [red1, green1, blue1],
    [
      Math.floor((2 * red0 + red1) / 3),
      Math.floor((2 * green0 + green1) / 3),
      Math.floor((2 * blue0 + blue1) / 3),
    ],
    [
      Math.floor((red0 + 2 * red1) / 3),
      Math.floor((green0 + 2 * green1) / 3),
      Math.floor((blue0 + 2 * blue1) / 3),
    ],
  ];
}

function decodeRgb565(value) {
  return [
    Math.round((((value >> 11) & 0x1f) * 255) / 31),
    Math.round((((value >> 5) & 0x3f) * 255) / 63),
    Math.round(((value & 0x1f) * 255) / 31),
  ];
}

function bgraToRgba(bgra) {
  const rgba = Buffer.alloc(bgra.length);
  for (let offset = 0; offset < bgra.length; offset += 4) {
    rgba[offset] = bgra[offset + 2];
    rgba[offset + 1] = bgra[offset + 1];
    rgba[offset + 2] = bgra[offset];
    rgba[offset + 3] = bgra[offset + 3];
  }
  return rgba;
}

async function promoteIconsToWebapp(args, generated, missing) {
  const generatedBySlug = new Map(
    generated.map((entry) => [entry.skillSlug, entry]),
  );
  const missingBySlug = new Map(
    missing.map((entry) => [entry.skillSlug, entry]),
  );
  const skillFiles = (await readdir(args.webappSkillDir))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
  const updatedSkillFiles = [];
  const promotedSkills = [];
  for (const fileName of skillFiles) {
    const filePath = path.join(args.webappSkillDir, fileName);
    const data = JSON.parse(await readFile(filePath, "utf8"));
    let changed = false;
    for (const category of SKILL_CATEGORIES) {
      for (const tier of data.skillTable?.[category] ?? []) {
        for (const skill of tier) {
          const icon = generatedBySlug.get(skill.slug);
          if (args.preserveExisting && skill.icon) {
            continue;
          }
          if (icon) {
            skill.icon = icon.publicPath;
            skill.source ??= {};
            skill.source.gameSources ??= {};
            skill.source.gameSources.iconAsset = icon.gameAssetPath;
            skill.source.gameSources.iconCollectionMethod = icon.matchedBy;
            skill.source.iconSource = {
              collectionStatus: "generated-high-confidence",
              confidence: icon.confidence,
              matchedBy: icon.matchedBy,
              matchedIconKey: icon.matchedIconKey,
              gameAssetPath: icon.gameAssetPath,
              publicPath: icon.publicPath,
              outputPath: path.join("webapp/static", icon.publicPath),
              sourceTexture: icon.sourceTexture,
              rendering: icon.rendering,
              output: icon.output,
            };
            promotedSkills.push(skill.slug);
            changed = true;
          } else if (!args.preserveExisting) {
            const missingIcon = missingBySlug.get(skill.slug);
            if (skill.icon) {
              delete skill.icon;
              changed = true;
            }
            if (skill.source?.gameSources?.iconAsset) {
              delete skill.source.gameSources.iconAsset;
              changed = true;
            }
            if (skill.source?.gameSources?.iconCollectionMethod) {
              delete skill.source.gameSources.iconCollectionMethod;
              changed = true;
            }
            if (missingIcon) {
              skill.source ??= {};
              skill.source.iconSource = {
                collectionStatus: "missing",
                confidence: "none",
                searchedIconKeys: missingIcon.searchedIconKeys,
                candidateAssetCount: missingIcon.candidateAssetCount,
                note: "No high-confidence SpecialistSkillIcons asset matched this skill during icon generation.",
              };
              changed = true;
            } else if (skill.source?.iconSource) {
              delete skill.source.iconSource;
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      await writeFile(
        filePath,
        `${JSON.stringify(data, null, "\t")}\n`,
        "utf8",
      );
      updatedSkillFiles.push(filePath);
    }
  }
  return { updatedSkillFiles, promotedSkills };
}

function findDuplicateHashes(generated) {
  const groups = new Map();
  for (const entry of generated) {
    const hash = entry.output.sha256;
    const group = groups.get(hash) ?? [];
    group.push({
      skillSlug: entry.skillSlug,
      publicPath: entry.publicPath,
      gameAssetPath: entry.gameAssetPath,
    });
    groups.set(hash, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, skills]) => ({ sha256, skills }));
}

async function writeReports(outDir, report) {
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "skill-icons.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "skill-icons.md"),
    renderMarkdownReport(report),
    "utf8",
  );
}

function renderMarkdownReport(report) {
  const lines = [
    "# KF3 Skill Icon Generation",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Candidate skills: ${report.summary.candidateSkillCount}`,
    `- Icon assets discovered: ${report.summary.iconAssetCount}`,
    `- High-confidence matches: ${report.summary.matchedIconCount}`,
    `- Generated icons: ${report.summary.generatedIconCount}`,
    `- Failed icons: ${report.summary.failedIconCount}`,
    `- Missing icons: ${report.summary.missingIconCount}`,
    `- Ambiguous icons: ${report.summary.ambiguousIconCount}`,
    `- Duplicate output hashes: ${report.summary.duplicateHashCount}`,
    `- Updated skill files: ${report.summary.updatedSkillFiles}`,
    "",
  ];

  if (report.missing.length > 0) {
    lines.push("## Missing icons", "");
    for (const missing of report.missing) {
      lines.push(
        `- ${missing.skillSlug} (${missing.category} tier ${missing.tierNumber})`,
      );
    }
    lines.push("");
  }
  if (report.ambiguous.length > 0) {
    lines.push("## Ambiguous icons", "");
    for (const ambiguous of report.ambiguous) {
      lines.push(
        `- ${ambiguous.skillSlug}: ${ambiguous.assetPaths.join(", ")}`,
      );
    }
    lines.push("");
  }
  if (report.failed.length > 0) {
    lines.push("## Failed generation", "");
    for (const failed of report.failed) {
      lines.push(`- ${failed.skillSlug}: ${failed.error}`);
    }
    lines.push("");
  }
  if (report.duplicateHashes.length > 0) {
    lines.push("## Duplicate output hashes", "");
    for (const duplicate of report.duplicateHashes) {
      lines.push(
        `- ${duplicate.sha256}: ${duplicate.skills.map((skill) => skill.skillSlug).join(", ")}`,
      );
    }
    lines.push("");
  }
  lines.push("## Generated icons", "");
  for (const generated of report.generated) {
    lines.push(
      `- ${generated.skillSlug} → ${generated.publicPath} (${generated.gameAssetPath})`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function printSummary(report, listOnly) {
  console.log(
    `${listOnly ? "Scanned" : "Generated"} ${report.summary.generatedIconCount} skill icon(s).`,
  );
  console.log(
    `Missing: ${report.summary.missingIconCount}; ambiguous: ${report.summary.ambiguousIconCount}; failed: ${report.summary.failedIconCount}.`,
  );
  console.log(`Updated skill files: ${report.summary.updatedSkillFiles}.`);
  console.log("Report: scratch/skill-icon-collection/skill-icons.md");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function ensureWindowsToolingAvailable() {
  const result = spawnSync("which", ["powershell.exe"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      "powershell.exe is required to generate icons from WSL/Linux.",
    );
  }
}

async function assertWindowsFileExists(windowsPath, label) {
  const localPath = windowsToLocalPath(windowsPath);
  if (!(await exists(localPath))) {
    throw new Error(
      `${label} not found at ${windowsPath}. See tools/kf3-data/README.md.`,
    );
  }
}

async function prepareScratchRoot({ gameRoot, scratchRoot, aesFile }) {
  const command = `
$ErrorActionPreference = 'Stop'
$gameRoot = ${psQuote(gameRoot)}
$scratchRoot = ${psQuote(scratchRoot)}
$aesFile = ${psQuote(aesFile)}
$paksTarget = Join-Path $gameRoot 'Nightfall\\Content\\Paks'
$paksParent = Join-Path $scratchRoot 'Nightfall\\Content'
$paksLink = Join-Path $paksParent 'Paks'
New-Item -ItemType Directory -Force -Path $paksParent | Out-Null
if (-not (Test-Path $paksLink)) {
  New-Item -ItemType Junction -Path $paksLink -Target $paksTarget | Out-Null
}
Copy-Item $aesFile (Join-Path $scratchRoot 'aes.txt') -Force
`;
  runPowerShell(command, "prepare scratch Nightfall root");
}

function runPowerShell(command, label, { allowFailure = false } = {}) {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    {
      encoding: "utf8",
      maxBuffer: 200 * 1024 * 1024,
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status}:\n${output}`);
  }
  return { status: result.status, output };
}

function pathJoinWindows(...segments) {
  return segments.join("\\").replaceAll(/\\+/g, "\\");
}

function toWindowsPath(inputPath) {
  const windowsMatch = /^([A-Za-z]):\\/.exec(inputPath);
  if (windowsMatch) {
    return inputPath;
  }
  const wslMatch = /^\/mnt\/([A-Za-z])\/(.*)$/.exec(inputPath);
  if (wslMatch) {
    return `${wslMatch[1].toUpperCase()}:\\${wslMatch[2].replaceAll("/", "\\")}`;
  }
  return inputPath;
}

function windowsToLocalPath(windowsPath) {
  if (process.platform === "win32") {
    return windowsPath;
  }
  const match = /^([A-Za-z]):\\(.*)$/.exec(windowsPath);
  if (!match) {
    return windowsPath;
  }
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll("\\", "/")}`;
}

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
