import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.ts'

const connectionString = Deno.env.get('DATABASE_URL')

if (!connectionString) {
	throw new Error(
		'DATABASE_URL is missing. Run with `--tunnel` (Deno Deploy) or set DATABASE_URL locally.',
	)
}

const pool = new pg.Pool({
	connectionString,
})

export const db = drizzle({
	client: pool,
	schema,
})

export async function closeDb(): Promise<void> {
	await pool.end()
}
