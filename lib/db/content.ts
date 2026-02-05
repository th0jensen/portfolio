import { eq } from 'drizzle-orm'
import { CommonLocaleSchema } from '~/lib/schemas.ts'
import { getDb } from './client.ts'
import { localizedContent } from './schema.ts'

export async function getLocaleContent(locale: string) {
	const db = getDb()
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

	return result.data
}
