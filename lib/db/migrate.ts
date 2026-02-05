import { sql } from 'drizzle-orm'
import { CommonLocaleSchema } from '~/lib/schemas.ts'
import { client, db } from './client.ts'
import { localizedContent } from './schema.ts'

const LOCALES = ['en', 'no', 'he'] as const

const CONNECT_RETRIES = Number(Deno.env.get('DB_CONNECT_RETRIES') ?? '10')
const CONNECT_DELAY_MS = Number(Deno.env.get('DB_CONNECT_DELAY_MS') ?? '1000')

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readLocaleFile(locale: string) {
	const candidates = [
		`${Deno.cwd()}/lib/locales/${locale}/common.json`,
		`${Deno.cwd()}/locales/${locale}/common.json`,
		new URL(`../lib/locales/${locale}/common.json`, import.meta.url),
		new URL(`../locales/${locale}/common.json`, import.meta.url),
	]

	let lastError: unknown = null
	for (const url of candidates) {
		try {
			return await Deno.readTextFile(url)
		} catch (error) {
			lastError = error
		}
	}

	const message = lastError instanceof Error
		? lastError.message
		: String(lastError)
	throw new Error(
		`Locale file not found for "${locale}". Checked: ` +
			`${candidates.map((url) =>
				typeof url === 'string' ? url : url.pathname
			).join(', ')}. ` +
			`Last error: ${message}`,
	)
}

async function waitForDb(dbInstance: typeof db) {
	let lastError: unknown = null
	for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt += 1) {
		try {
			await dbInstance.execute(sql`select 1`)
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

async function ensureTables(dbInstance: typeof db) {
	await dbInstance.execute(sql`
		CREATE TABLE IF NOT EXISTS "localized_content" (
			"locale" text PRIMARY KEY NOT NULL,
			"content" jsonb NOT NULL
		);
	`)
}

async function seedLocales(dbInstance: typeof db) {
	const values = [] as Array<{ locale: string; content: unknown }>

	for (const locale of LOCALES) {
		const raw = await readLocaleFile(locale)
		const parsed = CommonLocaleSchema.parse(JSON.parse(raw))
		values.push({ locale, content: parsed })
	}

	if (values.length === 0) return

	await dbInstance
		.insert(localizedContent)
		.values(values)
		.onConflictDoUpdate({
			target: localizedContent.locale,
			set: { content: sql`excluded.content` },
		})
}

export async function runMigrations() {
	try {
		await waitForDb(db)
		await ensureTables(db)
		await seedLocales(db)
	} finally {
		await client.end({ timeout: 5 })
	}
}

let migrationPromise: Promise<void> | null = null

export async function runMigrationsOnce() {
	if (!migrationPromise) {
		migrationPromise = runMigrations()
	}
	await migrationPromise
}
