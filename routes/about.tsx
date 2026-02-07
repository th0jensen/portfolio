import { define } from '~/utils.ts'
import { redirectToLocale } from '~/lib/locale.ts'

export const handler = define.handlers({
	GET(ctx) {
		return redirectToLocale(ctx.req, '/about')
	},
})
