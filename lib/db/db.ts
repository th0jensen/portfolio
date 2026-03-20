import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type pg from 'pg'
import * as schema from './schema.ts'

type Database = NodePgDatabase<typeof schema>

let dbPromise: Promise<Database | null> | null = null
let poolPromise: Promise<pg.Pool | null> | null = null

export function isDatabaseConfigured(): boolean {
	return Boolean(Deno.env.get('DATABASE_URL'))
}

async function getPool(): Promise<pg.Pool | null> {
	if (!poolPromise) {
		poolPromise = (async () => {
			const connectionString = Deno.env.get('DATABASE_URL')
			if (!connectionString) {
				return null
			}

			const [{ default: pgModule }] = await Promise.all([
				import('pg'),
			])

			return new pgModule.Pool({ connectionString })
		})()
	}

	return await poolPromise
}

export async function getDb(): Promise<Database | null> {
	if (!dbPromise) {
		dbPromise = (async () => {
			const pool = await getPool()
			if (!pool) {
				return null
			}

			const [{ drizzle }] = await Promise.all([
				import('drizzle-orm/node-postgres'),
			])

			return drizzle({
				client: pool,
				schema,
			})
		})()
	}

	return await dbPromise
}

export async function requireDb(): Promise<Database> {
	const db = await getDb()
	if (!db) {
		throw new Error(
			'DATABASE_URL is missing. Run with `--tunnel` (Deno Deploy) or set DATABASE_URL locally.',
		)
	}

	return db
}

export async function closeDb(timeoutMs = 5000): Promise<void> {
	const pool = await getPool()
	if (!pool) {
		return
	}

	let closed = false
	const closePromise = pool.end().then(() => {
		closed = true
	}).catch((error) => {
		console.error('Failed to close DB pool cleanly:', error)
	})

	await Promise.race([
		closePromise,
		new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
	])

	if (!closed) {
		console.warn(
			`DB pool close timed out after ${timeoutMs}ms; proceeding with process exit.`,
		)
	}
}
