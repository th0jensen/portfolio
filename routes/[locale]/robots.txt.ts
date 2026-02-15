import { LocaleCodeSchema } from '~/lib/i18n.ts'
import { define } from '~/utils.ts'

const ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /api/images/
Disallow: /api/
Disallow: /_fresh/
Sitemap: https://thojensen.com/sitemap.xml
`

export const handler = define.handlers({
	GET(ctx) {
		const localeResult = LocaleCodeSchema.safeParse(ctx.params.locale)
		if (!localeResult.success) {
			return new Response('Not found', { status: 404 })
		}

		return new Response(ROBOTS_TXT, {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
			},
		})
	},
})
