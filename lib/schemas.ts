import { z } from 'zod'

// About schema
export const AboutSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	birthday: z.string(),
	humanLanguages: z.array(z.string()),
	computerLanguages: z.array(z.string()),
})

export type About = z.infer<typeof AboutSchema>

export const MetadataSchema = z.object({
	name: z.string(),
	altName: z.string(),
	description: z.string(),
	footerText: z.string(),
})

export type Metadata = z.infer<typeof MetadataSchema>

// Project schema
export const ProjectSourceSchema = z.object({
	type: z.string(),
	link: z.string().url(),
})

export const ProjectSchema = z.object({
	name: z.string(),
	status: z.string().optional(),
	imageURL: z.string(),
	technologies: z.record(z.string(), z.string()),
	description: z.string(),
	source: ProjectSourceSchema.optional(),
})

export type Project = z.infer<typeof ProjectSchema>

// GitHub repo schema
export const FormattedRepoSchema = z.object({
	name: z.string(),
	description: z.string(),
	url: z.string().url(),
	stars: z.number().int().nonnegative(),
	forks: z.number().int().nonnegative(),
	language: z.string().optional(),
	languageColor: z.string().optional(),
	type: z.enum(['repo', 'pr', 'zed-extension']).optional(),
	prNumber: z.number().int().positive().optional(),
	prState: z.enum(['open', 'closed', 'merged']).optional(),
	additions: z.number().int().nonnegative().optional(),
	deletions: z.number().int().nonnegative().optional(),
	downloads: z.number().int().nonnegative().optional(),
	zedExtensionUrl: z.string().url().optional(),
	githubUrl: z.string().url().optional(),
})

export type FormattedRepo = z.infer<typeof FormattedRepoSchema>

// Common locale schema
export const MetaSchema = z.object({
	description: z.string(),
})

export const NavSchema = z.object({
	work: z.string(),
	experience: z.string(),
	contact: z.string(),
	openMenu: z.string(),
	closeMenu: z.string(),
})

export const HeroSchema = z.object({
	role: z.string(),
	description: z.string(),
	exploreWork: z.string(),
	github: z.string(),
	linkedin: z.string(),
	headshotAlt: z.string(),
})

export const WorkSchema = z.object({
	subtitle: z.string(),
	title: z.string(),
	showMore: z.string(),
	showLess: z.string(),
	visitProject: z.string(),
	downloadAppStore: z.string(),
	viewOnGitHub: z.string(),
})

export const ExperienceSchema = z.object({
	subtitle: z.string(),
	title: z.string(),
	description: z.string(),
})

export const ThemeSchema = z.object({
	light: z.string(),
	dark: z.string(),
})

export const FooterSchema = z.object({
	copyright: z.string(),
})

export const ButtonsSchema = z.object({
	github: z.string(),
	linkedin: z.string(),
})

// Full common locale schema
export const CommonLocaleSchema = z.object({
	meta: MetaSchema,
	nav: NavSchema,
	about: AboutSchema,
	metadata: MetadataSchema,
	hero: HeroSchema,
	work: WorkSchema,
	projects: z.array(ProjectSchema),
	experience: ExperienceSchema,
	theme: ThemeSchema,
	footer: FooterSchema,
	buttons: ButtonsSchema,
})

export type CommonLocale = z.infer<typeof CommonLocaleSchema>

// Helper function to parse and validate locale data
export function parseLocaleData(data: unknown): CommonLocale {
	return CommonLocaleSchema.parse(data)
}
