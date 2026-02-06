import { count } from 'drizzle-orm'
import { closeDb, db } from './db.ts'
import { assetImages, localeTranslations } from './schema.ts'
import { getTranslationData } from './locales.ts'

async function verifyDbState(): Promise<void> {
	const localeRows = await db
		.select({
			count: count(),
		})
		.from(localeTranslations)

	const imageRows = await db
		.select({
			count: count(),
		})
		.from(assetImages)

	const localesCount = Number(localeRows[0]?.count ?? 0)
	const imagesCount = Number(imageRows[0]?.count ?? 0)

	const { locale, translationData } = await getTranslationData('en')
	const firstProjectImageUrl = translationData.common.projects[0]?.imageURL ??
		null

	console.log(`locale_translations rows: ${localesCount}`)
	console.log(`asset_images rows: ${imagesCount}`)
	console.log(`resolved locale: ${locale}`)
	console.log(
		`first project imageURL from DB payload: ${firstProjectImageUrl}`,
	)
}

let exitCode = 0

try {
	await verifyDbState()
} catch (error) {
	exitCode = 1
	console.error('DB verify failed:', error)
} finally {
	await closeDb()
}

Deno.exit(exitCode)
