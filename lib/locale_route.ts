import { getTranslationData } from '~/lib/db/locales.ts'
import { define } from '~/utils.ts'

export const localizedPageMiddleware = define.middleware(async (ctx) => {
	const { locale, translationData } = await getTranslationData(
		ctx.params.locale,
	)

	if (locale !== ctx.params.locale) {
		const url = new URL(ctx.req.url)
		const pathSegments = url.pathname.split('/')
		pathSegments[1] = locale
		url.pathname = pathSegments.join('/')

		return Response.redirect(url.toString(), 302)
	}

	ctx.state.locale = locale
	ctx.state.translationData = translationData as unknown as Record<
		string,
		Record<string, string>
	>

	return await ctx.next()
})
