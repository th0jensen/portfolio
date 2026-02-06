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

export async function closeDb(timeoutMs = 5000): Promise<void> {
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
