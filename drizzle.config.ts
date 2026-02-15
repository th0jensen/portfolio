import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	out: './drizzle',
	schema: './lib/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: Deno.env.get('DATABASE_URL')!,
	},
})
