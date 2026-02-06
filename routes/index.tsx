import { define } from '~/utils.ts'
import {
	DEFAULT_LOCALE,
	type LocaleCode,
	SUPPORTED_LOCALES,
} from '~/lib/i18n.ts'

function parseAcceptLanguage(header: string | null): string[] {
	if (!header) return []

	return header
		.split(',')
		.map((lang) => {
			const [locale, quality = 'q=1'] = lang.trim().split(';')
			const q = parseFloat(quality.replace('q=', '')) || 1
			return { locale: locale.trim().toLowerCase(), q }
		})
		.sort((a, b) => b.q - a.q)
		.map(({ locale }) => locale)
}

function matchLocale(acceptedLanguages: string[]): LocaleCode {
	for (const lang of acceptedLanguages) {
		// Exact match (e.g., "en", "no", "he")
		if (SUPPORTED_LOCALES.includes(lang as LocaleCode)) {
			return lang as LocaleCode
		}

		// Match language part (e.g., "en-US" -> "en", "nb-NO" -> "no")
		const langPrefix = lang.split('-')[0]

		// Norwegian variations (nb, nn, no) -> no
		if (['nb', 'nn', 'no'].includes(langPrefix)) {
			return 'no'
		}

		// Hebrew variations (he, iw) -> he
		if (['he', 'iw'].includes(langPrefix)) {
			return 'he'
		}

		// English variations -> en
		if (langPrefix === 'en') {
			return 'en'
		}
	}

	return DEFAULT_LOCALE
}

export const handler = define.handlers({
	GET(ctx) {
		const acceptLanguage = ctx.req.headers.get('Accept-Language')
		const preferredLanguages = parseAcceptLanguage(acceptLanguage)
		const locale = matchLocale(preferredLanguages)

		return new Response(null, {
			status: 302,
			headers: {
				Location: `/${locale}`,
				'Vary': 'Accept-Language',
				Link: [
					'<https://fonts.googleapis.com>; rel=preconnect',
					'<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
					'<https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap>; rel=preload; as=style',
				].join(', '),
			},
		})
	},
})
