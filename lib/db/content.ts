import { eq } from 'drizzle-orm'
import { CommonLocaleSchema } from '~/lib/schemas.ts'
import { db } from './client.ts'
import { localizedContent } from './schema.ts'

const CACHE_TTL_MS = 1000 * 5
const contentCache = new Map<string, { data: ReturnType<typeof CommonLocaleSchema.parse>; ts: number }>()

export async function getLocaleContent(locale: string) {
	const cached = contentCache.get(locale)
	const now = Date.now()
	if (cached && now - cached.ts < CACHE_TTL_MS) {
		return cached.data
	}

	const rows = await db
		.select({ content: localizedContent.content })
		.from(localizedContent)
		.where(eq(localizedContent.locale, locale))
		.limit(1)

	if (rows.length === 0) {
		return null
	}

	const result = CommonLocaleSchema.safeParse(rows[0].content)
	if (!result.success) {
		console.error('Locale data validation failed:', result.error)
		return null
	}

	contentCache.set(locale, { data: result.data, ts: now })
	return result.data
}
