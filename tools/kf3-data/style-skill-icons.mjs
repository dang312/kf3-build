#!/usr/bin/env node

/**
 * Apply the approved KF3 icon-library treatment to promoted skill glyphs.
 *
 * This is intentionally deterministic: it preserves each extracted glyph's
 * alpha mask and only remaps its light/dark silhouette colors to the Horzine
 * cyan/technical-rule palette. Selection, maxed, and locked variants remain
 * CSS states so the same game-accurate glyph can be reused everywhere.
 */

import { createRequire } from 'node:module';
import { readdir, readFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const iconRoot = path.join(projectRoot, 'webapp/static/skill-icons');
const scratchRoot = path.join(projectRoot, 'scratch');
const packagePath = path.join(projectRoot, 'webapp/package.json');
const requireFromWebapp = createRequire(packagePath);
const sharp = requireFromWebapp('sharp');

const CORE = [116, 245, 255];
const OUTLINE = [58, 73, 75];
const LUMA_THRESHOLD = 0.28;

async function collectIcons(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectIcons(entryPath)));
		else if (entry.isFile() && entry.name.endsWith('.webp')) files.push(entryPath);
	}
	return files.sort();
}

function stylePixels(buffer) {
	let changedPixels = 0;
	for (let offset = 0; offset < buffer.length; offset += 4) {
		const alpha = buffer[offset + 3];
		if (alpha === 0) continue;

		const luminance =
			(0.2126 * buffer[offset] + 0.7152 * buffer[offset + 1] + 0.0722 * buffer[offset + 2]) / 255;
		const color = luminance < LUMA_THRESHOLD ? OUTLINE : CORE;
		if (
			buffer[offset] !== color[0] ||
			buffer[offset + 1] !== color[1] ||
			buffer[offset + 2] !== color[2]
		) {
			changedPixels += 1;
		}
		buffer[offset] = color[0];
		buffer[offset + 1] = color[1];
		buffer[offset + 2] = color[2];
	}
	return changedPixels;
}

async function styleIcon(filePath) {
	const source = await readFile(filePath);
	const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const changedPixels = stylePixels(data);
	const temporaryPath = `${filePath}.hud-style.tmp.webp`;
	await sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 }
	})
		.webp({ lossless: true, quality: 95 })
		.toFile(temporaryPath);
	await rename(temporaryPath, filePath);
	return { file: path.relative(projectRoot, filePath), changedPixels };
}

async function main() {
	const icons = await collectIcons(iconRoot);
	if (icons.length === 0) throw new Error(`No WebP icons found under ${iconRoot}`);
	const results = [];
	for (const icon of icons) results.push(await styleIcon(icon));
	await mkdir(scratchRoot, { recursive: true });
	await import('node:fs/promises').then(({ writeFile }) =>
		writeFile(
			path.join(scratchRoot, 'skill-icon-hud-style-report.json'),
			JSON.stringify(
				{
					iconCount: results.length,
					palette: { core: '#74F5FF', outline: '#3A494B' },
					sourceReference: 'docs/design-source/stitch/icon/screen.png',
					results
				},
				null,
				2
			) + '\n'
		)
	);
	console.log(`Styled ${results.length} skill icons using the KF3 icon-library palette.`);
}

await main();
