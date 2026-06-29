#!/usr/bin/env node
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEFAULT_WINDOWS_ROOT } from './lib/game-inventory.mjs';

const DEFAULT_OUT_DIR = 'scratch/skill-collection';
const DEFAULT_LOCRES_GAME_CSV = 'scratch/locres-game-en/Game.csv';
const DEFAULT_RAW_EXTRACT_ROOT = 'scratch/raw-extract';
const DEFAULT_WORK_ROOT = 'C:\\Temp\\kf3-build-tools';
const DEFAULT_ENGINE_VERSION = 'UE5_4';
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RAW_FILTERS = [
	'SkillTree',
	'Skills_DT',
	'Skills_CT',
	'Skill_Rewards_DT',
	'Progression'
];

function parseArgs(argv) {
	const args = {
		gameRoot: process.env.KF3_GAME_ROOT ?? DEFAULT_WINDOWS_ROOT,
		outDir: DEFAULT_OUT_DIR,
		locresGameCsv: DEFAULT_LOCRES_GAME_CSV,
		rawExtractRoot: DEFAULT_RAW_EXTRACT_ROOT,
		workRoot: DEFAULT_WORK_ROOT,
		engineVersion: DEFAULT_ENGINE_VERSION,
		maxAttempts: DEFAULT_MAX_ATTEMPTS,
		refreshExtracts: false,
		fmodelExportRoot: undefined,
		rawFilters: DEFAULT_RAW_FILTERS
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--game-root') {
			args.gameRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--out-dir') {
			args.outDir = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--locres-game-csv') {
			args.locresGameCsv = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--raw-extract-root') {
			args.rawExtractRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--work-root') {
			args.workRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--ueextractor-dir') {
			args.ueextractorDir = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--helper-dll') {
			args.helperDll = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--aes-file') {
			args.aesFile = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--dotnet-exe') {
			args.dotnetExe = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--engine-version') {
			args.engineVersion = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--max-attempts') {
			args.maxAttempts = parsePositiveInteger(requiredValue(argv, index, arg), arg);
			index += 1;
		} else if (arg === '--fmodel-export-root') {
			args.fmodelExportRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--raw-filters') {
			args.rawFilters = requiredValue(argv, index, arg)
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean);
			index += 1;
		} else if (arg === '--refresh-extracts') {
			args.refreshExtracts = true;
		} else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	args.ueextractorDir ??= pathJoinWindows(args.workRoot, 'ueextractor');
	args.helperDll ??= pathJoinWindows(args.workRoot, 'ueextractor-helper', 'UeExtractorHelper.dll');
	args.aesFile ??= pathJoinWindows(args.workRoot, 'aes-dump-input', 'aes.txt');
	args.dotnetExe ??= 'C:\\Program Files\\dotnet\\dotnet.exe';
	return args;
}

function requiredValue(argv, index, arg) {
	const value = argv[index + 1];
	if (!value || value.startsWith('--')) {
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

function printHelp() {
	console.log(`Usage: node tools/kf3-data/run-skill-collection.mjs [options]\n\nRuns the KF3 skill collection report. By default it reuses already extracted files in scratch/. Pass --refresh-extracts to refresh local UEExtractor outputs first.\n\nSimple rerun:\n  node tools/kf3-data/run-skill-collection.mjs\n\nRefresh from the local Nightfall install, then rerun:\n  node tools/kf3-data/run-skill-collection.mjs --refresh-extracts\n\nOptions:\n  --game-root PATH          KF3/Nightfall install root. Defaults to KF3_GAME_ROOT or ${DEFAULT_WINDOWS_ROOT}\n  --out-dir PATH            Collection output. Defaults to ${DEFAULT_OUT_DIR}\n  --locres-game-csv PATH    Local Game.locres CSV path. Defaults to ${DEFAULT_LOCRES_GAME_CSV}\n  --raw-extract-root PATH   Local raw .uasset extract root. Defaults to ${DEFAULT_RAW_EXTRACT_ROOT}\n  --refresh-extracts        Refresh locres/raw extracts before collecting.\n  --work-root PATH          Windows work root for UEExtractor. Defaults to ${DEFAULT_WORK_ROOT}\n  --ueextractor-dir PATH    Windows UEExtractor folder. Defaults to <work-root>\\ueextractor\n  --helper-dll PATH         Windows UeExtractorHelper.dll path. Defaults to <work-root>\\ueextractor-helper\\UeExtractorHelper.dll\n  --aes-file PATH           Windows AES key file. Defaults to <work-root>\\aes-dump-input\\aes.txt\n  --dotnet-exe PATH         Windows dotnet.exe path. Defaults to C:\\Program Files\\dotnet\\dotnet.exe\n  --engine-version VALUE    UEExtractor/CUE4Parse engine version. Defaults to ${DEFAULT_ENGINE_VERSION}\n  --max-attempts N          Retry count for nondeterministic archive mounting. Defaults to ${DEFAULT_MAX_ATTEMPTS}\n  --raw-filters A,B,C       Raw asset filters to extract. Defaults to ${DEFAULT_RAW_FILTERS.join(',')}\n  --fmodel-export-root PATH Also scan FModel text/JSON exports. Omitted by default.`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.refreshExtracts) {
		await refreshExtracts(args);
	}
	await runCollector(args);
}

async function refreshExtracts(args) {
	ensureWindowsToolingAvailable();
	await assertWindowsFileExists(pathJoinWindows(args.ueextractorDir, 'UEExtractor.exe'), 'UEExtractor.exe');
	await assertWindowsFileExists(args.helperDll, 'UeExtractorHelper.dll');
	await assertWindowsFileExists(args.aesFile, 'AES key file');

	const scratchRoot = pathJoinWindows(args.workRoot, 'nightfall-scratch-root');
	const workRawExtractRoot = pathJoinWindows(args.workRoot, 'raw-extract');
	const workLocresGameCsv = pathJoinWindows(args.workRoot, 'locres-game-en', 'Game.csv');

	await prepareScratchRoot({
		gameRoot: toWindowsPath(args.gameRoot),
		scratchRoot,
		aesFile: args.aesFile
	});

	await extractLocres({
		ueextractorDir: args.ueextractorDir,
		scratchRoot,
		outputCsv: workLocresGameCsv,
		engineVersion: args.engineVersion,
		maxAttempts: args.maxAttempts
	});
	await copyWindowsFileToLocal(workLocresGameCsv, args.locresGameCsv);

	await removeLocalPath(args.rawExtractRoot);
	for (const filter of args.rawFilters) {
		await extractRawFilter({
			dotnetExe: args.dotnetExe,
			helperDll: args.helperDll,
			scratchRoot,
			workRawExtractRoot,
			filter,
			engineVersion: args.engineVersion,
			maxAttempts: args.maxAttempts
		});
	}
	await copyWindowsDirectoryToLocal(workRawExtractRoot, args.rawExtractRoot);
}

function ensureWindowsToolingAvailable() {
	if (process.platform === 'win32') {
		return;
	}
	const result = spawnSync('which', ['powershell.exe'], { encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error('powershell.exe is required for --refresh-extracts from WSL/Linux.');
	}
}

async function assertWindowsFileExists(windowsPath, label) {
	const localPath = windowsToLocalPath(windowsPath);
	if (!(await exists(localPath))) {
		throw new Error(
			`${label} not found at ${windowsPath}. Keep binaries/keys local, then rerun. See tools/kf3-data/README.md.`
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
	runPowerShell(command, 'prepare scratch Nightfall root');
}

async function extractLocres({ ueextractorDir, scratchRoot, outputCsv, engineVersion, maxAttempts }) {
	await mkdir(path.dirname(windowsToLocalPath(outputCsv)), { recursive: true });
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		await rm(windowsToLocalPath(outputCsv), { force: true });
		const command = `
$ErrorActionPreference = 'Continue'
Set-Location ${psQuote(ueextractorDir)}
& '.\\UEExtractor.exe' ${psQuote(scratchRoot)} ${psQuote(outputCsv)} '--path=Nightfall/Content/Localization/Game/en' '--locres' ${psQuote(`--version=${engineVersion}`)}
exit $LASTEXITCODE
`;
		const result = runPowerShell(command, `extract Game.locres attempt ${attempt}`, { allowFailure: true });
		if (await locresLooksComplete(outputCsv)) {
			return;
		}
		console.warn(`Game.locres extraction attempt ${attempt} did not produce a complete CSV.`);
		if (attempt === maxAttempts) {
			throw new Error(`Failed to extract Game.locres after ${maxAttempts} attempt(s). Last exit: ${result.status}`);
		}
	}
}

async function locresLooksComplete(windowsCsvPath) {
	const localPath = windowsToLocalPath(windowsCsvPath);
	if (!(await exists(localPath))) {
		return false;
	}
	const text = await readFile(localPath, 'utf8');
	return text.includes('SkillDescription_Foster') && text.includes('SkillName_Nakata');
}

async function extractRawFilter({
	dotnetExe,
	helperDll,
	scratchRoot,
	workRawExtractRoot,
	filter,
	engineVersion,
	maxAttempts
}) {
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const command = `
$ErrorActionPreference = 'Continue'
& ${psQuote(dotnetExe)} ${psQuote(helperDll)} --mode extract-filter --game-root ${psQuote(scratchRoot)} --version ${psQuote(engineVersion)} --filter ${psQuote(filter)} --out-dir ${psQuote(workRawExtractRoot)}
exit $LASTEXITCODE
`;
		const result = runPowerShell(command, `extract raw filter ${filter} attempt ${attempt}`, {
			allowFailure: true
		});
		if (/Provider initialized\. Found 206398 virtual files\./.test(result.output) && /Extracted [1-9]\d* file\(s\)\./.test(result.output)) {
			return;
		}
		console.warn(`Raw extract filter ${filter} attempt ${attempt} did not mount/extract useful files.`);
		if (attempt === maxAttempts) {
			throw new Error(`Failed raw extract filter ${filter} after ${maxAttempts} attempt(s).`);
		}
	}
}

async function runCollector(args) {
	const collectorArgs = [
		'tools/kf3-data/collect-skill-candidates.mjs',
		'--game-root',
		args.gameRoot,
		'--out-dir',
		args.outDir,
		'--locres-game-csv',
		args.locresGameCsv,
		'--raw-extract-root',
		args.rawExtractRoot
	];
	if (args.fmodelExportRoot) {
		collectorArgs.push('--fmodel-export-root', args.fmodelExportRoot);
	} else {
		collectorArgs.push('--no-fmodel');
	}

	const result = spawnSync(process.execPath, collectorArgs, {
		stdio: 'inherit',
		encoding: 'utf8'
	});
	if (result.status !== 0) {
		throw new Error(`collect-skill-candidates failed with exit code ${result.status}`);
	}
}

function runPowerShell(command, label, options = {}) {
	const result = spawnSync(
		'powershell.exe',
		['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
		{ encoding: 'utf8' }
	);
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	if (output.trim()) {
		console.log(output.trim());
	}
	if (!options.allowFailure && result.status !== 0) {
		throw new Error(`${label} failed with exit code ${result.status}`);
	}
	return { status: result.status, output };
}

async function copyWindowsFileToLocal(windowsSource, localTarget) {
	await mkdir(path.dirname(localTarget), { recursive: true });
	await cp(windowsToLocalPath(windowsSource), localTarget);
}

async function copyWindowsDirectoryToLocal(windowsSource, localTarget) {
	await mkdir(path.dirname(localTarget), { recursive: true });
	await rm(localTarget, { recursive: true, force: true });
	await cp(windowsToLocalPath(windowsSource), localTarget, { recursive: true });
}

async function removeLocalPath(localPath) {
	await rm(localPath, { recursive: true, force: true });
}

async function exists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch (error) {
		if (error && error.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
}

function pathJoinWindows(...parts) {
	return parts.join('\\').replace(/\\+/g, '\\');
}

function toWindowsPath(inputPath) {
	if (/^[A-Za-z]:\\/.test(inputPath)) {
		return inputPath;
	}
	const match = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(inputPath);
	if (match) {
		return `${match[1].toUpperCase()}:\\${match[2].replaceAll('/', '\\')}`;
	}
	return inputPath;
}

function windowsToLocalPath(windowsPath) {
	if (process.platform === 'win32') {
		return windowsPath;
	}
	const match = /^([A-Za-z]):\\(.*)$/.exec(windowsPath);
	if (!match) {
		return windowsPath;
	}
	return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`;
}

function psQuote(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
