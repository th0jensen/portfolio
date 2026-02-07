import { getTranslationData } from '~/lib/db/locales.ts'
import { define } from '~/utils.ts'

export const localizedPageHandler = define.handlers({
	async GET(ctx) {
		const { locale, translationData } = await getTranslationData(
			ctx.params.locale,
		)

		if (locale !== ctx.params.locale) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/${locale}` },
			})
		}

		ctx.state.locale = locale
		ctx.state.translationData = translationData as unknown as Record<
			string,
			Record<string, string>
		>

		return { data: null }
	},
})
