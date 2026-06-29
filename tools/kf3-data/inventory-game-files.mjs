#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
	createGameInventory,
	DEFAULT_WINDOWS_ROOT,
	DEFAULT_WSL_ROOT
} from './lib/game-inventory.mjs';

function parseArgs(argv) {
	const args = {
		gameRoot: process.env.KF3_GAME_ROOT ?? DEFAULT_WINDOWS_ROOT,
		out: undefined
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--game-root') {
			args.gameRoot = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--out') {
			args.out = requiredValue(argv, index, arg);
			index += 1;
		} else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return args;
}

function requiredValue(argv, index, arg) {
	const value = argv[index + 1];
	if (!value || value.startsWith('--')) {
		throw new Error(`${arg} requires a value`);
	}
	return value;
}

function printHelp() {
	console.log(`Usage: node tools/kf3-data/inventory-game-files.mjs [--game-root PATH] [--out PATH]\n\nCreates a safe JSON inventory of KF3 package files and skill preview filenames.\n\nExamples:\n  node tools/kf3-data/inventory-game-files.mjs --game-root "${DEFAULT_WSL_ROOT}" --out scratch/kf3-game-inventory.json\n  node tools/kf3-data/inventory-game-files.mjs --game-root "${DEFAULT_WINDOWS_ROOT}" --out scratch/kf3-game-inventory.json`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const inventory = await createGameInventory(args.gameRoot);
	const json = `${JSON.stringify(inventory, null, 2)}\n`;

	if (args.out) {
		await mkdir(path.dirname(args.out), { recursive: true });
		await writeFile(args.out, json, 'utf8');
	} else {
		process.stdout.write(json);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
