import { eq } from 'drizzle-orm'
import { db } from './db.ts'
import { assetImages } from './schema.ts'

interface UpsertImageInput {
	key: string
	mimeType: string
	dataBase64: string
}

export async function upsertImageAsset({
	key,
	mimeType,
	dataBase64,
}: UpsertImageInput): Promise<void> {
	await db
		.insert(assetImages)
		.values({
			key,
			mimeType,
			dataBase64,
		})
		.onConflictDoUpdate({
			target: [assetImages.key],
			set: {
				mimeType,
				dataBase64,
				updatedAt: new Date().toISOString(),
			},
		})
}

export async function getImageAsset(
	key: string,
): Promise<{ mimeType: string; dataBase64: string } | null> {
	const rows = await db
		.select({
			mimeType: assetImages.mimeType,
			dataBase64: assetImages.dataBase64,
		})
		.from(assetImages)
		.where(eq(assetImages.key, key))
		.limit(1)

	if (rows.length === 0) {
		return null
	}

	return {
		mimeType: rows[0].mimeType,
		dataBase64: rows[0].dataBase64,
	}
}
