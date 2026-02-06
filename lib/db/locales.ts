import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db.ts'
import { type LocaleNamespace, localeTranslations } from './schema.ts'
import { DEFAULT_LOCALE, type LocaleCode, LocaleCodeSchema } from '../i18n.ts'
import { type CommonLocale, CommonLocaleSchema } from '../schemas.ts'
export const LocaleNamespaceSchema = z.enum(['common'])

export const TranslationDataSchema = z.object({
	common: CommonLocaleSchema,
})

export type TranslationData = z.infer<typeof TranslationDataSchema>

interface UpsertLocaleInput {
	locale: LocaleCode
	namespace?: LocaleNamespace
	payload: CommonLocale
}

export async function upsertLocaleTranslation({
	locale,
	namespace = 'common',
	payload,
}: UpsertLocaleInput): Promise<void> {
	const parsedPayload = CommonLocaleSchema.parse(payload)

	await db
		.insert(localeTranslations)
		.values({
			locale,
			namespace,
			payload: parsedPayload,
		})
		.onConflictDoUpdate({
			target: [localeTranslations.locale, localeTranslations.namespace],
			set: {
				payload: parsedPayload,
				updatedAt: new Date().toISOString(),
			},
		})
}

async function findLocalePayload(
	locale: LocaleCode,
	namespace: LocaleNamespace = 'common',
): Promise<CommonLocale | null> {
	const rows = await db
		.select({
			payload: localeTranslations.payload,
		})
		.from(localeTranslations)
		.where(
			and(
				eq(localeTranslations.locale, locale),
				eq(localeTranslations.namespace, namespace),
			),
		)
		.limit(1)

	if (rows.length === 0) {
		return null
	}

	return CommonLocaleSchema.parse(rows[0].payload)
}

export async function getTranslationData(
	requestedLocale: string,
): Promise<{ locale: LocaleCode; translationData: TranslationData }> {
	const parsedLocale = LocaleCodeSchema.safeParse(requestedLocale)
	const locale = parsedLocale.success ? parsedLocale.data : DEFAULT_LOCALE

	const localePayload = await findLocalePayload(locale)
	if (localePayload) {
		return {
			locale,
			translationData: {
				common: localePayload,
			},
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
		translationData: {
			common: fallbackPayload,
		},
	}
}
