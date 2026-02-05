import { eq } from 'drizzle-orm'
import { CommonLocaleSchema } from '~/lib/schemas.ts'
import { db } from './client.ts'
import { localizedContent } from './schema.ts'

const CACHE_TTL_MS = 1000 * 5
const contentCache = new Map<string, { data: ReturnType<typeof CommonLocaleSchema.parse>; ts: number }>()

async function readLocaleFile(locale: string) {
	const candidates = [
		`${Deno.cwd()}/lib/locales/${locale}/common.json`,
		`${Deno.cwd()}/locales/${locale}/common.json`,
		new URL(`../lib/locales/${locale}/common.json`, import.meta.url),
		new URL(`../locales/${locale}/common.json`, import.meta.url),
	]

	let lastError: unknown = null
	for (const path of candidates) {
		try {
			const raw = await Deno.readTextFile(path)
			return CommonLocaleSchema.parse(JSON.parse(raw))
		} catch (error) {
			lastError = error
		}
	}

	console.error(
		`Failed to read locale file for "${locale}". Last error:`,
		lastError,
	)
	return null
}

export async function getLocaleContent(locale: string) {
	const cached = contentCache.get(locale)
	const now = Date.now()
	if (cached && now - cached.ts < CACHE_TTL_MS) {
		return cached.data
	}

	let rows: Array<{ content: unknown }> = []
	try {
		rows = await db
			.select({ content: localizedContent.content })
			.from(localizedContent)
			.where(eq(localizedContent.locale, locale))
			.limit(1)
	} catch (error) {
		console.error('Failed to fetch locale content:', error)
		console.error(
			'Locale query error details:',
			JSON.stringify(error, Object.getOwnPropertyNames(error)),
		)
		const fallback = await readLocaleFile(locale)
		if (fallback) {
			contentCache.set(locale, { data: fallback, ts: now })
		}
		return fallback
	}

	if (rows.length === 0) {
		const fallback = await readLocaleFile(locale)
		if (fallback) {
			contentCache.set(locale, { data: fallback, ts: now })
		}
		return fallback
	}

	const result = CommonLocaleSchema.safeParse(rows[0].content)
	if (!result.success) {
		console.error('Locale data validation failed:', result.error)
		const fallback = await readLocaleFile(locale)
		if (fallback) {
			contentCache.set(locale, { data: fallback, ts: now })
		}
		return fallback
	}

	contentCache.set(locale, { data: result.data, ts: now })
	return result.data
}
