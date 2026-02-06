import { closeDb, db } from './db.ts'
import { upsertImageAsset } from './images.ts'
import { upsertLocaleTranslation } from './locales.ts'
import { assetImages, localeTranslations } from './schema.ts'
import { LocaleCodeSchema } from '../i18n.ts'
import { parseLocaleData } from '../schemas.ts'

interface LocaleSeedRow {
	locale: string
	rawJson: unknown
}

const STATIC_IMAGE_ASSETS: Array<{ key: string; staticPath: string }> = [
	{ key: 'headshot.jpg', staticPath: 'headshot.jpg' },
	{ key: 'headshot.webp', staticPath: 'headshot.webp' },
	{ key: 'appstore.svg', staticPath: 'appstore.svg' },
]

function getErrorCode(error: unknown): string | undefined {
	let current: unknown = error

	while (current && typeof current === 'object') {
		if ('code' in current && typeof current.code === 'string') {
			return current.code
		}
		if ('cause' in current) {
			current = current.cause
			continue
		}
		break
	}

	return undefined
}

function getErrorMessages(error: unknown): string[] {
	const messages: string[] = []
	let current: unknown = error

	while (current && typeof current === 'object') {
		if ('message' in current && typeof current.message === 'string') {
			messages.push(current.message)
		}
		if ('cause' in current) {
			current = current.cause
			continue
		}
		break
	}

	return messages
}

function isMissingTableError(error: unknown): boolean {
	const code = getErrorCode(error)
	if (code === '42P01') {
		return true
	}

	const messages = getErrorMessages(error)
	return messages.some((message) =>
		message.includes('relation "asset_images" does not exist') ||
		message.includes('relation "locale_translations" does not exist')
	)
}

async function loadLocaleFiles(): Promise<LocaleSeedRow[]> {
	const localesDir = new URL('../../locales/', import.meta.url)
	const rows: LocaleSeedRow[] = []

	for await (const entry of Deno.readDir(localesDir)) {
		if (!entry.isDirectory) {
			continue
		}

		const commonPath = new URL(
			`../../locales/${entry.name}/common.json`,
			import.meta.url,
		)
		const fileContent = await Deno.readTextFile(commonPath)
		rows.push({
			locale: entry.name,
			rawJson: JSON.parse(fileContent),
		})
	}

	return rows
}

function imageKeyFromUrl(url: string): string | null {
	if (url.startsWith('/api/images/')) {
		return url.replace('/api/images/', '')
	}

	if (url.startsWith('/images/')) {
		return url.replace('/images/', '')
	}

	return null
}

function imageUrlFromKey(key: string): string {
	return `/api/images/${key}`
}

function mimeTypeForImage(key: string): string {
	const lowerKey = key.toLowerCase()
	if (lowerKey.endsWith('.webp')) return 'image/webp'
	if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) {
		return 'image/jpeg'
	}
	if (lowerKey.endsWith('.png')) return 'image/png'
	if (lowerKey.endsWith('.gif')) return 'image/gif'
	if (lowerKey.endsWith('.svg')) return 'image/svg+xml'
	if (lowerKey.endsWith('.avif')) return 'image/avif'

	throw new Error(`Unsupported image type for "${key}"`)
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	const chunkSize = 0x8000

	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize)
		binary += String.fromCharCode(...chunk)
	}

	return btoa(binary)
}

async function seedProjectImages(imageKeys: Set<string>): Promise<void> {
	await db.delete(assetImages)

	const imageSourcePath = new Map<string, string>()

	for (const key of imageKeys) {
		imageSourcePath.set(key, `images/${key}`)
	}

	for (const asset of STATIC_IMAGE_ASSETS) {
		imageSourcePath.set(asset.key, asset.staticPath)
	}

	for (const [key, sourcePath] of imageSourcePath) {
		const imagePath = new URL(`../../static/${sourcePath}`, import.meta.url)
		const imageData = await Deno.readFile(imagePath)
		await upsertImageAsset({
			key,
			mimeType: mimeTypeForImage(key),
			dataBase64: bytesToBase64(imageData),
		})
	}
}

async function seed(): Promise<void> {
	const localeRows = await loadLocaleFiles()
	const imageKeys = new Set<string>()

	await db.delete(localeTranslations)

	for (const row of localeRows) {
		const locale = LocaleCodeSchema.parse(row.locale)
		const parsedPayload = parseLocaleData(row.rawJson)
		const projectRows = parsedPayload.projects.map((project) => {
			const imageKey = imageKeyFromUrl(project.imageURL)
			if (!imageKey) {
				return project
			}
			imageKeys.add(imageKey)
			return {
				...project,
				imageURL: imageUrlFromKey(imageKey),
			}
		})
		await upsertLocaleTranslation({
			locale,
			payload: {
				...parsedPayload,
				projects: projectRows,
			},
		})
	}

	await seedProjectImages(imageKeys)

	console.log(
		`Seeded ${localeRows.length} locale payload(s) and ${
			imageKeys.size + STATIC_IMAGE_ASSETS.length
		} image asset(s) into the database.`,
	)
}

let exitCode = 0

try {
	await seed()
} catch (error) {
	exitCode = 1
	if (isMissingTableError(error)) {
		console.error(
			[
				'Missing required database tables.',
				'Run migrations first in the same environment/context you are seeding:',
				'`deno task db:migrate:tunnel`',
			].join(' '),
		)
	} else {
		console.error('Seed failed:', error)
	}
} finally {
	await closeDb()
}

Deno.exit(exitCode)
