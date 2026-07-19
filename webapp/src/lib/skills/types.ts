export const SKILL_CATEGORIES = ['passives', 'throwable', 'gadget'] as const;

export type PerkSlug = string;
export type PerkSlugMigrationMap = Record<PerkSlug, PerkSlug>;
export type PerkLevel = number;
export type OperationalBudget = number;

export type OperationalBudgetFormula = {
	type: string;
	parameters: Record<string, number>;
	verificationStatus: 'provisional' | 'verified';
	sourceNote?: string;
};

export type SkillSlug = string;
export type SkillSlugMigrationMap = Record<SkillSlug, SkillSlug>;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];
export type SkillTierNumber = number;
export type SkillRank = number;

export type SkillSlot = {
	category: SkillCategory;
	tierNumber: SkillTierNumber;
};

export type SkillSelection = SkillSlot & {
	skillSlug: SkillSlug;
	rank: SkillRank;
};

export type SkillSelections = SkillSelection[];

export type BuildState = {
	perkSlug: PerkSlug;
	perkLevel: PerkLevel;
	skillSelections: SkillSelections;
};

export type SkillEffect = {
	type?: string;
	description: string;
	values?: Record<string, number[]>; // Rank-indexed arrays include the equipped base effect at index 0.
};

export type SkillCandidatePreviewFile = {
	fileName: string;
	folder: string;
	relativePath: string;
};

export type SkillCandidateGameSources = {
	locresNameKey?: string;
	locresDescriptionKey?: string;
	levelRequirementSource?: string;
	rawSkillTreeAsset?: string;
	iconAsset?: string;
	iconCollectionMethod?: string;
	[key: string]: string | undefined;
};

export type GeneratedSkillIconSource = {
	collectionStatus: 'generated-high-confidence';
	confidence: 'high';
	matchedBy: string;
	matchedIconKey: string;
	gameAssetPath: string;
	publicPath: string;
	outputPath: string;
	sourceTexture: {
		pixelFormat: string;
		width: number;
		height: number;
	};
	rendering?: {
		method: string;
		note?: string;
	};
	output: {
		format: 'webp';
		width: number;
		height: number;
		sha256: string;
	};
};

export type MissingSkillIconSource = {
	collectionStatus: 'missing';
	confidence: 'none';
	searchedIconKeys: string[];
	candidateAssetCount: number;
	note: string;
	rendering?: undefined;
};

export type SkillIconSource = GeneratedSkillIconSource | MissingSkillIconSource;

export type SkillCandidateSource = {
	perkSlug: PerkSlug;
	candidateSkillSlug: SkillSlug;
	candidateSkillName: string;
	collectionStatus: string;
	previewFiles: SkillCandidatePreviewFile[];
	fmodelMatches: unknown[];
	notes: string[];
	alternateNames?: string[];
	alternateSkillSlugs?: SkillSlug[];
	internalName?: string;
	category?: SkillCategory;
	skillNumber?: number;
	tierNumber?: SkillTierNumber;
	treeOrder?: number;
	unlockLevel?: PerkLevel;
	description?: string;
	gameSources?: SkillCandidateGameSources;
	[key: string]: unknown;
};

export type SkillOption = {
	slug: SkillSlug;
	name: string;
	icon?: string;
	category?: SkillCategory;
	tierNumber?: SkillTierNumber;
	unlockLevel?: PerkLevel;
	internalName?: string;
	treeOrder?: number;
	skillNumber?: number;
	effect: SkillEffect;
	values?: Record<string, number[]>; // Rank-indexed arrays include the equipped base effect at index 0.
	rankCap?: SkillRank; // Zero means the selected skill has no upgrade ranks.
	source?: SkillCandidateSource & { iconSource?: SkillIconSource };
};

export type ProficiencyEntry = {
	name: string;
	description: string;
	values?: Record<string, number[]>;
};

export type PerkDataSource = {
	collectionGeneratedAt?: string;
	collectionSource?: string;
	collectionReport?: string;
	collectionSummary?: unknown;
	levelRequirements?: Partial<Record<SkillCategory, PerkLevel[]>>;
	notes?: string[];
};

export type PerkSkillData = {
	slug: PerkSlug;
	name: string;
	character: string;
	dataStatus?: string;
	source?: PerkDataSource;
	operationalBudgetFormula?: OperationalBudgetFormula;
	skillTable: Record<SkillCategory, SkillOption[][]>;
	proficiency?: ProficiencyEntry[];
	unplacedSkillCandidates?: SkillCandidateSource[];
};

export type PerkSummary = {
	slug: PerkSlug;
	name: string;
	character: string;
	file?: string;
	skillCount: number;
	unplacedSkillCandidateCount: number;
};

export type BuildSummarySkill = SkillSlot & {
	skill: SkillOption;
	rank: SkillRank;
	unlockLevel: PerkLevel;
	description: string;
};

export type BuildSummarySlot = SkillSlot & {
	unlockLevel: PerkLevel;
	selectedSkillSlug?: SkillSlug;
};

export type BuildSummary = {
	perk: PerkSkillData;
	perkLevel: PerkLevel;
	selectedSkillCount: number;
	activeSkillCount: number;
	unlockedSlotCount: number;
	activeSkills: BuildSummarySkill[];
	lockedSkills: BuildSummarySkill[];
	invalidSelections: SkillSelection[];
	incompleteUnlockedSlots: BuildSummarySlot[];
	warnings: string[];
	operationalBudget: OperationalBudget | undefined;
	operationalBudgetStatus: 'pending' | 'provisional' | 'verified';
	operationalBudgetNote?: string;
};
