import { sql } from 'drizzle-orm'
import { CommonLocaleSchema } from '~/lib/schemas.ts'
import { getClient, getDb } from './client.ts'
import { localizedContent } from './schema.ts'

const LOCALES = ['en', 'no', 'he'] as const

const CONNECT_RETRIES = Number(Deno.env.get('DB_CONNECT_RETRIES') ?? '10')
const CONNECT_DELAY_MS = Number(Deno.env.get('DB_CONNECT_DELAY_MS') ?? '1000')

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForDb(db: ReturnType<typeof getDb>) {
	let lastError: unknown = null
	for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt += 1) {
		try {
			await db.execute(sql`select 1`)
			return
		} catch (error) {
			lastError = error
			await sleep(CONNECT_DELAY_MS)
		}
	}

	const message = lastError instanceof Error
		? lastError.message
		: String(lastError)
	throw new Error(
		`Database connection failed after ${CONNECT_RETRIES} attempts. ` +
			`Check DATABASE_URL and that Postgres is running. Last error: ${message}`,
	)
}

async function ensureTables(db: ReturnType<typeof getDb>) {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "localized_content" (
			"locale" text PRIMARY KEY NOT NULL,
			"content" jsonb NOT NULL
		);
	`)
}

async function seedLocales(db: ReturnType<typeof getDb>) {
	const values = [] as Array<{ locale: string; content: unknown }>

	for (const locale of LOCALES) {
		const fileUrl = new URL(
			`../lib/locales/${locale}/common.json`,
			import.meta.url,
		)
		const raw = await Deno.readTextFile(fileUrl)
		const parsed = CommonLocaleSchema.parse(JSON.parse(raw))
		values.push({ locale, content: parsed })
	}

	if (values.length === 0) return

	await db
		.insert(localizedContent)
		.values(values)
		.onConflictDoUpdate({
			target: localizedContent.locale,
			set: { content: sql`excluded.content` },
		})
}

export async function runMigrations() {
	const db = getDb()
	const client = getClient()
	try {
		await waitForDb(db)
		await ensureTables(db)
		await seedLocales(db)
	} finally {
		await client.end({ timeout: 5 })
	}
}

let migrationPromise: Promise<void> | null = null

export async function migrateIfEnabled() {
	if (Deno.env.get('DB_MIGRATE_ON_START') !== 'true') {
		return
	}
	if (!migrationPromise) {
		migrationPromise = runMigrations()
	}
	await migrationPromise
}
