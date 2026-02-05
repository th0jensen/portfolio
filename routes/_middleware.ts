import { define } from '~/utils.ts'
import { getLocaleContent } from '~/lib/db/content.ts'
import { runMigrationsOnce } from '~/lib/db/migrate.ts'

const SUPPORTED_LOCALES = new Set(['en', 'no', 'he'])

export const handler = define.middleware(async (ctx) => {
	await runMigrationsOnce()
	const { pathname } = new URL(ctx.req.url)
	const [, locale] = pathname.split('/')

	if (locale && SUPPORTED_LOCALES.has(locale)) {
		const content = await getLocaleContent(locale)
		if (content) {
			ctx.state.translationData = { common: content }
		}
	}

	return await ctx.next()
})
