import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.ts'

const databaseUrl = Deno.env.get('DATABASE_URL')
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set')
}

export const client = postgres(databaseUrl, {
	max: 2,
	ssl: { rejectUnauthorized: false },
	prepare: false,
})

export const db = drizzle(client, { schema })
