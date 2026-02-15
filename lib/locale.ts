import {
	DEFAULT_LOCALE,
	SUPPORTED_LOCALES,
	type LocaleCode,
} from '~/lib/i18n.ts'

export function parseAcceptLanguage(header: string | null): string[] {
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

export function matchLocale(acceptedLanguages: string[]): LocaleCode {
	for (const lang of acceptedLanguages) {
		if (SUPPORTED_LOCALES.includes(lang as LocaleCode)) {
			return lang as LocaleCode
		}

		const langPrefix = lang.split('-')[0]

		if (['nb', 'nn', 'no'].includes(langPrefix)) {
			return 'no'
		}

		if (['he', 'iw'].includes(langPrefix)) {
			return 'he'
		}

		if (langPrefix === 'en') {
			return 'en'
		}
	}

	return DEFAULT_LOCALE
}

export function getPreferredLocale(req: Request): LocaleCode {
	const acceptLanguage = req.headers.get('Accept-Language')
	const preferredLanguages = parseAcceptLanguage(acceptLanguage)
	return matchLocale(preferredLanguages)
}

export function buildLocalePath(locale: LocaleCode, pathSuffix = ''): string {
	if (!pathSuffix) return `/${locale}`
	const suffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
	return `/${locale}${suffix}`
}

export function redirectToLocale(req: Request, pathSuffix = ''): Response {
	const locale = getPreferredLocale(req)
	return new Response(null, {
		status: 302,
		headers: {
			Location: buildLocalePath(locale, pathSuffix),
			'Vary': 'Accept-Language',
		},
	})
}
