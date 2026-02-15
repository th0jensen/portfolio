import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db.ts'
import {
	localeAbout,
	localeButtons,
	type LocaleCode as DbLocaleCode,
	localeExperience,
	localeFooter,
	localeHero,
	localeMeta,
	localeMetadata,
	localeNav,
	localeProjects,
	localeTheme,
	localeWork,
} from './schema.ts'
import { DEFAULT_LOCALE, type LocaleCode, LocaleCodeSchema } from '../i18n.ts'
import { type CommonLocale, CommonLocaleSchema } from '../schemas.ts'

export const TranslationDataSchema = z.object({
	common: CommonLocaleSchema,
})

export type TranslationData = z.infer<typeof TranslationDataSchema>

interface UpsertLocaleInput {
	locale: LocaleCode
	payload: CommonLocale
}

function toDbLocale(locale: LocaleCode): DbLocaleCode {
	return locale
}

const translationDataCache = new Map<LocaleCode, TranslationData>()

function getCachedTranslationData(locale: LocaleCode): TranslationData | null {
	return translationDataCache.get(locale) || null
}

function setCachedTranslationData(
	locale: LocaleCode,
	translationData: TranslationData,
): TranslationData {
	translationDataCache.set(locale, translationData)
	return translationData
}

async function readLocalePayloadFromFilesystem(
	locale: LocaleCode,
): Promise<CommonLocale | null> {
	try {
		const fileUrl = new URL(
			`../../locales/${locale}/common.json`,
			import.meta.url,
		)
		const rawText = await Deno.readTextFile(fileUrl)
		const json = JSON.parse(rawText)
		return CommonLocaleSchema.parse(json)
	} catch {
		return null
	}
}

export async function clearLocaleTranslations(): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(localeProjects)
		await tx.delete(localeButtons)
		await tx.delete(localeFooter)
		await tx.delete(localeTheme)
		await tx.delete(localeExperience)
		await tx.delete(localeWork)
		await tx.delete(localeHero)
		await tx.delete(localeAbout)
		await tx.delete(localeNav)
		await tx.delete(localeMeta)
		await tx.delete(localeMetadata)
	})
}

export async function upsertLocaleTranslation({
	locale,
	payload,
}: UpsertLocaleInput): Promise<void> {
	const parsedPayload = CommonLocaleSchema.parse(payload)
	const dbLocale = toDbLocale(locale)
	const now = new Date().toISOString()

	await db.transaction(async (tx) => {
		await tx
			.insert(localeMetadata)
			.values({
				locale: dbLocale,
				name: parsedPayload.metadata.name,
				altName: parsedPayload.metadata.altName,
				description: parsedPayload.metadata.description,
				footerText: parsedPayload.metadata.footerText,
			})
			.onConflictDoUpdate({
				target: [localeMetadata.locale],
				set: {
					name: parsedPayload.metadata.name,
					altName: parsedPayload.metadata.altName,
					description: parsedPayload.metadata.description,
					footerText: parsedPayload.metadata.footerText,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeMeta)
			.values({
				locale: dbLocale,
				description: parsedPayload.meta.description,
			})
			.onConflictDoUpdate({
				target: [localeMeta.locale],
				set: {
					description: parsedPayload.meta.description,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeNav)
			.values({
				locale: dbLocale,
				work: parsedPayload.nav.work,
				experience: parsedPayload.nav.experience,
				contact: parsedPayload.nav.contact,
				openMenu: parsedPayload.nav.openMenu,
				closeMenu: parsedPayload.nav.closeMenu,
			})
			.onConflictDoUpdate({
				target: [localeNav.locale],
				set: {
					work: parsedPayload.nav.work,
					experience: parsedPayload.nav.experience,
					contact: parsedPayload.nav.contact,
					openMenu: parsedPayload.nav.openMenu,
					closeMenu: parsedPayload.nav.closeMenu,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeAbout)
			.values({
				locale: dbLocale,
				firstName: parsedPayload.about.firstName,
				lastName: parsedPayload.about.lastName,
				birthday: parsedPayload.about.birthday,
				humanLanguages: parsedPayload.about.humanLanguages,
				computerLanguages: parsedPayload.about.computerLanguages,
			})
			.onConflictDoUpdate({
				target: [localeAbout.locale],
				set: {
					firstName: parsedPayload.about.firstName,
					lastName: parsedPayload.about.lastName,
					birthday: parsedPayload.about.birthday,
					humanLanguages: parsedPayload.about.humanLanguages,
					computerLanguages: parsedPayload.about.computerLanguages,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeHero)
			.values({
				locale: dbLocale,
				role: parsedPayload.hero.role,
				description: parsedPayload.hero.description,
				exploreWork: parsedPayload.hero.exploreWork,
				github: parsedPayload.hero.github,
				linkedin: parsedPayload.hero.linkedin,
				headshotAlt: parsedPayload.hero.headshotAlt,
			})
			.onConflictDoUpdate({
				target: [localeHero.locale],
				set: {
					role: parsedPayload.hero.role,
					description: parsedPayload.hero.description,
					exploreWork: parsedPayload.hero.exploreWork,
					github: parsedPayload.hero.github,
					linkedin: parsedPayload.hero.linkedin,
					headshotAlt: parsedPayload.hero.headshotAlt,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeWork)
			.values({
				locale: dbLocale,
				subtitle: parsedPayload.work.subtitle,
				title: parsedPayload.work.title,
				showMore: parsedPayload.work.showMore,
				showLess: parsedPayload.work.showLess,
				visitProject: parsedPayload.work.visitProject,
				downloadAppStore: parsedPayload.work.downloadAppStore,
				viewOnGitHub: parsedPayload.work.viewOnGitHub,
			})
			.onConflictDoUpdate({
				target: [localeWork.locale],
				set: {
					subtitle: parsedPayload.work.subtitle,
					title: parsedPayload.work.title,
					showMore: parsedPayload.work.showMore,
					showLess: parsedPayload.work.showLess,
					visitProject: parsedPayload.work.visitProject,
					downloadAppStore: parsedPayload.work.downloadAppStore,
					viewOnGitHub: parsedPayload.work.viewOnGitHub,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeExperience)
			.values({
				locale: dbLocale,
				subtitle: parsedPayload.experience.subtitle,
				title: parsedPayload.experience.title,
				description: parsedPayload.experience.description,
			})
			.onConflictDoUpdate({
				target: [localeExperience.locale],
				set: {
					subtitle: parsedPayload.experience.subtitle,
					title: parsedPayload.experience.title,
					description: parsedPayload.experience.description,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeTheme)
			.values({
				locale: dbLocale,
				light: parsedPayload.theme.light,
				dark: parsedPayload.theme.dark,
			})
			.onConflictDoUpdate({
				target: [localeTheme.locale],
				set: {
					light: parsedPayload.theme.light,
					dark: parsedPayload.theme.dark,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeFooter)
			.values({
				locale: dbLocale,
				copyright: parsedPayload.footer.copyright,
			})
			.onConflictDoUpdate({
				target: [localeFooter.locale],
				set: {
					copyright: parsedPayload.footer.copyright,
					updatedAt: now,
				},
			})

		await tx
			.insert(localeButtons)
			.values({
				locale: dbLocale,
				github: parsedPayload.buttons.github,
				linkedin: parsedPayload.buttons.linkedin,
			})
			.onConflictDoUpdate({
				target: [localeButtons.locale],
				set: {
					github: parsedPayload.buttons.github,
					linkedin: parsedPayload.buttons.linkedin,
					updatedAt: now,
				},
			})

		await tx.delete(localeProjects).where(
			eq(localeProjects.locale, dbLocale),
		)
		if (parsedPayload.projects.length > 0) {
			await tx.insert(localeProjects).values(
				parsedPayload.projects.map((project, index) => ({
					locale: dbLocale,
					projectIndex: index,
					name: project.name,
					status: project.status ?? null,
					imageUrl: project.imageURL,
					technologies: project.technologies,
					description: project.description,
					sourceType: project.source?.type ?? null,
					sourceLink: project.source?.link ?? null,
				})),
			)
		}
	})
}

async function findLocalePayload(
	locale: LocaleCode,
): Promise<CommonLocale | null> {
	const dbLocale = toDbLocale(locale)

	const [
		metadataRows,
		metaRows,
		navRows,
		aboutRows,
		heroRows,
		workRows,
		experienceRows,
		themeRows,
		footerRows,
		buttonsRows,
		projectRows,
	] = await Promise.all([
		db
			.select({
				name: localeMetadata.name,
				altName: localeMetadata.altName,
				description: localeMetadata.description,
				footerText: localeMetadata.footerText,
			})
			.from(localeMetadata)
			.where(eq(localeMetadata.locale, dbLocale))
			.limit(1),
		db
			.select({
				description: localeMeta.description,
			})
			.from(localeMeta)
			.where(eq(localeMeta.locale, dbLocale))
			.limit(1),
		db
			.select({
				work: localeNav.work,
				experience: localeNav.experience,
				contact: localeNav.contact,
				openMenu: localeNav.openMenu,
				closeMenu: localeNav.closeMenu,
			})
			.from(localeNav)
			.where(eq(localeNav.locale, dbLocale))
			.limit(1),
		db
			.select({
				firstName: localeAbout.firstName,
				lastName: localeAbout.lastName,
				birthday: localeAbout.birthday,
				humanLanguages: localeAbout.humanLanguages,
				computerLanguages: localeAbout.computerLanguages,
			})
			.from(localeAbout)
			.where(eq(localeAbout.locale, dbLocale))
			.limit(1),
		db
			.select({
				role: localeHero.role,
				description: localeHero.description,
				exploreWork: localeHero.exploreWork,
				github: localeHero.github,
				linkedin: localeHero.linkedin,
				headshotAlt: localeHero.headshotAlt,
			})
			.from(localeHero)
			.where(eq(localeHero.locale, dbLocale))
			.limit(1),
		db
			.select({
				subtitle: localeWork.subtitle,
				title: localeWork.title,
				showMore: localeWork.showMore,
				showLess: localeWork.showLess,
				visitProject: localeWork.visitProject,
				downloadAppStore: localeWork.downloadAppStore,
				viewOnGitHub: localeWork.viewOnGitHub,
			})
			.from(localeWork)
			.where(eq(localeWork.locale, dbLocale))
			.limit(1),
		db
			.select({
				subtitle: localeExperience.subtitle,
				title: localeExperience.title,
				description: localeExperience.description,
			})
			.from(localeExperience)
			.where(eq(localeExperience.locale, dbLocale))
			.limit(1),
		db
			.select({
				light: localeTheme.light,
				dark: localeTheme.dark,
			})
			.from(localeTheme)
			.where(eq(localeTheme.locale, dbLocale))
			.limit(1),
		db
			.select({
				copyright: localeFooter.copyright,
			})
			.from(localeFooter)
			.where(eq(localeFooter.locale, dbLocale))
			.limit(1),
		db
			.select({
				github: localeButtons.github,
				linkedin: localeButtons.linkedin,
			})
			.from(localeButtons)
			.where(eq(localeButtons.locale, dbLocale))
			.limit(1),
		db
			.select({
				name: localeProjects.name,
				status: localeProjects.status,
				imageURL: localeProjects.imageUrl,
				technologies: localeProjects.technologies,
				description: localeProjects.description,
				sourceType: localeProjects.sourceType,
				sourceLink: localeProjects.sourceLink,
			})
			.from(localeProjects)
			.where(eq(localeProjects.locale, dbLocale))
			.orderBy(asc(localeProjects.projectIndex)),
	])

	const metadata = metadataRows[0]
	const meta = metaRows[0]
	const nav = navRows[0]
	const about = aboutRows[0]
	const hero = heroRows[0]
	const work = workRows[0]
	const experience = experienceRows[0]
	const theme = themeRows[0]
	const footer = footerRows[0]
	const buttons = buttonsRows[0]

	if (
		!metadata || !meta || !nav || !about || !hero || !work || !experience ||
		!theme || !footer || !buttons
	) {
		return null
	}

	const payload: CommonLocale = {
		meta: {
			description: meta.description,
		},
		nav: {
			work: nav.work,
			experience: nav.experience,
			contact: nav.contact,
			openMenu: nav.openMenu,
			closeMenu: nav.closeMenu,
		},
		about: {
			firstName: about.firstName,
			lastName: about.lastName,
			birthday: about.birthday,
			humanLanguages: about.humanLanguages,
			computerLanguages: about.computerLanguages,
		},
		metadata: {
			name: metadata.name,
			altName: metadata.altName,
			description: metadata.description,
			footerText: metadata.footerText,
		},
		hero: {
			role: hero.role,
			description: hero.description,
			exploreWork: hero.exploreWork,
			github: hero.github,
			linkedin: hero.linkedin,
			headshotAlt: hero.headshotAlt,
		},
		work: {
			subtitle: work.subtitle,
			title: work.title,
			showMore: work.showMore,
			showLess: work.showLess,
			visitProject: work.visitProject,
			downloadAppStore: work.downloadAppStore,
			viewOnGitHub: work.viewOnGitHub,
		},
		projects: projectRows.map((project) => ({
			name: project.name,
			status: project.status ?? undefined,
			imageURL: project.imageURL,
			technologies: project.technologies,
			description: project.description,
			source: project.sourceType && project.sourceLink
				? {
					type: project.sourceType,
					link: project.sourceLink,
				}
				: undefined,
		})),
		experience: {
			subtitle: experience.subtitle,
			title: experience.title,
			description: experience.description,
		},
		theme: {
			light: theme.light,
			dark: theme.dark,
		},
		footer: {
			copyright: footer.copyright,
		},
		buttons: {
			github: buttons.github,
			linkedin: buttons.linkedin,
		},
	}

	return CommonLocaleSchema.parse(payload)
}

export async function getTranslationData(
	requestedLocale: string,
): Promise<{ locale: LocaleCode; translationData: TranslationData }> {
	const parsedLocale = LocaleCodeSchema.safeParse(requestedLocale)
	const locale = parsedLocale.success ? parsedLocale.data : DEFAULT_LOCALE

	const cached = getCachedTranslationData(locale)
	if (cached) {
		return { locale, translationData: cached }
	}

	const filePayload = await readLocalePayloadFromFilesystem(locale)
	if (filePayload) {
		return {
			locale,
			translationData: setCachedTranslationData(locale, {
				common: filePayload,
			}),
		}
	}

	const localePayload = await findLocalePayload(locale)
	if (localePayload) {
		return {
			locale,
			translationData: setCachedTranslationData(locale, {
				common: localePayload,
			}),
		}
	}

	const fallbackCached = getCachedTranslationData(DEFAULT_LOCALE)
	if (fallbackCached) {
		return {
			locale: DEFAULT_LOCALE,
			translationData: fallbackCached,
		}
	}

	const fallbackFilePayload = await readLocalePayloadFromFilesystem(
		DEFAULT_LOCALE,
	)
	if (fallbackFilePayload) {
		return {
			locale: DEFAULT_LOCALE,
			translationData: setCachedTranslationData(DEFAULT_LOCALE, {
				common: fallbackFilePayload,
			}),
		}
	}

	const fallbackPayload = await findLocalePayload(DEFAULT_LOCALE)
	if (!fallbackPayload) {
		throw new Error(
			`Missing fallback translations for locale "${DEFAULT_LOCALE}" in database.`,
		)
	}

	return {
		locale: DEFAULT_LOCALE,
		translationData: setCachedTranslationData(DEFAULT_LOCALE, {
			common: fallbackPayload,
		}),
	}
}
