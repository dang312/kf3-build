import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_WINDOWS_ROOT = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Nightfall';
export const DEFAULT_WSL_ROOT = '/mnt/c/Program Files (x86)/Steam/steamapps/common/Nightfall';

const KNOWN_PREFIXES = new Map([
	['Comm', 'commando'],
	['Eng', 'engineer'],
	['Fire', 'firebug'],
	['Medic', 'medic'],
	['Nin', 'ninja'],
	['Sharp', 'sharpshooter'],
	['SS', 'sharpshooter']
]);

export function normalizeGameRoot(gameRoot) {
	if (process.platform !== 'win32') {
		const windowsMatch = /^([A-Za-z]):\\(.*)$/.exec(gameRoot);
		if (windowsMatch) {
			const drive = windowsMatch[1].toLowerCase();
			const rest = windowsMatch[2].replaceAll('\\', '/');
			return `/mnt/${drive}/${rest}`;
		}
	}
	return gameRoot;
}

export async function exists(filePath) {
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

export async function listFilesRecursive(root, shouldInclude = () => true) {
	if (!(await exists(root))) {
		return [];
	}

	const files = [];
	const pending = [root];

	while (pending.length > 0) {
		const current = pending.pop();
		const entries = await readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const entryPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				pending.push(entryPath);
			} else if (entry.isFile() && shouldInclude(entryPath)) {
				files.push(entryPath);
			}
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

export async function createGameInventory(gameRootInput) {
	const gameRoot = normalizeGameRoot(gameRootInput);

	if (!(await exists(gameRoot))) {
		throw new Error(`Game root does not exist: ${gameRoot}`);
	}

	const [packages, skillPreviews] = await Promise.all([
		listPackageFiles(gameRoot),
		listSkillPreviews(gameRoot)
	]);

	const duplicateCandidateSkillSlugs = findDuplicateCandidateSkillSlugs(skillPreviews);
	return {
		generatedAt: new Date().toISOString(),
		gameRoot,
		packages,
		skillPreviews,
		summary: {
			packageCount: packages.length,
			skillPreviewCount: skillPreviews.length,
			uniqueCandidateSkillSlugCount: new Set(
				skillPreviews.map((preview) => preview.candidateSkillSlug)
			).size,
			duplicateCandidateSkillSlugs,
			perkSlugs: [...new Set(skillPreviews.map((preview) => preview.perkSlug))].sort()
		}
	};
}

async function listPackageFiles(gameRoot) {
	const paksRoot = path.join(gameRoot, 'Nightfall', 'Content', 'Paks');
	const packageExtensions = new Set(['.pak', '.ucas', '.utoc', '.sig']);
	const packagePaths = await listFilesRecursive(paksRoot, (filePath) =>
		packageExtensions.has(path.extname(filePath).toLowerCase())
	);

	return Promise.all(
		packagePaths.map(async (filePath) => {
			const fileStat = await stat(filePath);
			return {
				name: path.basename(filePath),
				relativePath: toPortableRelativePath(gameRoot, filePath),
				bytes: fileStat.size
			};
		})
	);
}

async function listSkillPreviews(gameRoot) {
	const previewsRoot = path.join(gameRoot, 'Nightfall', 'Content', 'Movies', 'SkillPreviews');
	const previewPaths = await listFilesRecursive(
		previewsRoot,
		(filePath) => path.extname(filePath).toLowerCase() === '.mp4'
	);

	return previewPaths.map((filePath) => parseSkillPreview(gameRoot, previewsRoot, filePath));
}

function parseSkillPreview(gameRoot, previewsRoot, filePath) {
	const relativeToPreviewRoot = path.relative(previewsRoot, filePath).split(path.sep);
	const folder = relativeToPreviewRoot[0] ?? '';
	const fileName = path.basename(filePath);
	const baseName = fileName.replace(/_Preview\.mp4$/i, '');
	const folderPerk = folder.split('_Skills_')[0] || undefined;
	const { prefix, rawName } = splitPrefix(baseName);
	const perkSlug = KNOWN_PREFIXES.get(prefix ?? '') ?? toKebabCase(folderPerk ?? 'unknown');
	const candidateSkillName = pascalToWords(rawName);

	return {
		perkSlug,
		folder,
		fileName,
		prefix,
		candidateSkillName,
		candidateSkillSlug: `${perkSlug}-${toKebabCase(candidateSkillName)}`,
		relativePath: toPortableRelativePath(gameRoot, filePath)
	};
}

function splitPrefix(baseName) {
	const separatorIndex = baseName.indexOf('_');
	if (separatorIndex === -1) {
		return { prefix: undefined, rawName: baseName };
	}

	const prefix = baseName.slice(0, separatorIndex);
	const rawName = baseName.slice(separatorIndex + 1);
	return { prefix, rawName };
}

function pascalToWords(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replaceAll('_', ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function toKebabCase(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function toPortableRelativePath(root, filePath) {
	return path.relative(root, filePath).split(path.sep).join('/');
}

function findDuplicateCandidateSkillSlugs(skillPreviews) {
	const counts = new Map();
	for (const preview of skillPreviews) {
		counts.set(preview.candidateSkillSlug, (counts.get(preview.candidateSkillSlug) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([candidateSkillSlug, count]) => ({ candidateSkillSlug, count }));
}
