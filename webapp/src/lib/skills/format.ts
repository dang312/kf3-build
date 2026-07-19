import type { SkillCategory, SkillOption } from './types.ts';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
	passives: 'Passives',
	throwable: 'Throwable',
	gadget: 'Gadget'
};

export function formatCategoryLabel(category: SkillCategory): string {
	return CATEGORY_LABELS[category];
}

export function formatSkillDescription(skill: SkillOption, rank?: number): string {
	const values = skill.effect.values ?? skill.values;
	const description = formatDescriptionText(skill.effect.description);
	return interpolateSkillPlaceholders(description, values, rank);
}

export function formatDescriptionLines(skill: SkillOption, rank?: number): string[] {
	return formatSkillDescription(skill, rank)
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

export function formatDescriptionText(description: string): string {
	return decodeBasicEntities(description)
		.replace(/<cf\s*\/?\s*>/gi, '\n')
		.replace(/<br\s*\/?\s*>/gi, '\n')
		.replace(/<img\s+[^>]*id=["']?([^"'\s/>]+)["']?[^>]*\/?\s*>/gi, '[$1]')
		.replace(/<\/?(?:Emp|sEmp|b|strong|i|em)[^>]*>/gi, '')
		.replace(/<\/>/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/\r\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/[ \t]{2,}/g, ' ')
		.trim();
}

export function interpolateSkillPlaceholders(
	description: string,
	values: Record<string, number[]> | undefined,
	rank?: number
): string {
	if (!values) {
		return description;
	}

	const resolve = (match: string, key: string) => {
		const valueRange = values[key];
		if (!valueRange) return match;
		return rank === undefined
			? formatValueRange(valueRange)
			: formatValueAtRank(valueRange, rank, match);
	};

	return description
		.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => resolve(_match, key))
		.replace(/\{\s*(\d+)\s*\}/g, (_match, key: string) => resolve(_match, key));
}

export function formatValueAtRank(values: number[], rank: number, fallback: string): string {
	if (!Number.isInteger(rank) || rank < 0) return fallback;
	return values[rank] !== undefined ? String(values[rank]) : fallback;
}

export function formatValueRange(values: number[]): string {
	if (values.length === 0) {
		return '';
	}
	const first = values[0];
	const last = values[values.length - 1];
	return first === last ? String(first) : `${first}–${last}`;
}

function decodeBasicEntities(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}
