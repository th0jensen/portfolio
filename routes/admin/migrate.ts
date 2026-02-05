import { define } from '~/utils.ts'
import { runMigrations } from '~/lib/db/migrate.ts'

const SECRET = Deno.env.get('MIGRATION_SECRET')

export const handler = define.handlers({
	async POST(ctx) {
		if (!SECRET) {
			return new Response('Migration secret not configured', { status: 500 })
		}

		const token = ctx.req.headers.get('x-migration-secret') ??
			new URL(ctx.req.url).searchParams.get('token')

		if (token !== SECRET) {
			return new Response('Unauthorized', { status: 401 })
		}

		await runMigrations()
		return new Response('OK', { status: 200 })
	},
})
