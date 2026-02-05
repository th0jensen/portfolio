import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.ts'

let client: postgres.Sql | null = null
let db:
	| ReturnType<typeof drizzle<typeof schema>>
	| null = null

function isPoolerConnection(url: string) {
	return url.includes('pooler') || url.includes(':6543')
}

export function getClient() {
	if (client) return client

	const databaseUrl = Deno.env.get('DATABASE_URL')
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set')
	}

	client = postgres(databaseUrl, {
		max: 2,
		ssl: { rejectUnauthorized: false },
		prepare: !isPoolerConnection(databaseUrl),
	})

	return client
}

export function getDb() {
	if (db) return db
	db = drizzle(getClient(), { schema })
	return db
}
