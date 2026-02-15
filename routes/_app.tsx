import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'

export default define.page(function App({ Component, state }) {
	const t = createTranslator(state.translationData || {})
	const locale = state.locale || 'en'
	const localeLanguageTag = locale === 'no' ? 'nb' : locale
	const isRtl = locale === 'he'
	const assetOrigin = typeof state.assetOrigin === 'string'
		? state.assetOrigin
		: ''
	const siteOrigin = assetOrigin || 'https://thojensen.com'
	const requestPath = typeof state.requestPath === 'string'
		? state.requestPath
		: `/${locale}`
	const normalizedPath = requestPath === '/'
		? `/${locale}`
		: requestPath.endsWith('/') && requestPath.length > 1
		? requestPath.slice(0, -1)
		: requestPath
	const localePrefix = `/${locale}`
	const pathSuffix = normalizedPath === localePrefix
		? ''
		: normalizedPath.startsWith(`${localePrefix}/`)
		? normalizedPath.slice(localePrefix.length)
		: ''
	const canonicalUrl = `${siteOrigin}${normalizedPath}`
	const alternateLocaleUrls = {
		en: `${siteOrigin}/en${pathSuffix}`,
		no: `${siteOrigin}/no${pathSuffix}`,
		he: `${siteOrigin}/he${pathSuffix}`,
	} as const
	const assetHost = assetOrigin ? new URL(assetOrigin).host : ''
	const resolvedTitle = t('common.metadata.name')
	const resolvedDescription = t('common.metadata.description')
	const title = resolvedTitle === 'common.metadata.name'
		? 'Thomas Jensen'
		: resolvedTitle
	const description = resolvedDescription === 'common.metadata.description'
		? 'Thomas Jensen - Full Stack Software Developer focused on creating elegant solutions through clean code. Explore my projects and experience.'
		: resolvedDescription
	const personJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: title,
		url: canonicalUrl,
		jobTitle: t('common.hero.role'),
		sameAs: [
			'https://github.com/th0jensen',
			'https://www.linkedin.com/in/thomas-jensen-75a488208/',
		],
	}
	const webSiteJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Thomas Jensen',
		url: siteOrigin,
		inLanguage: localeLanguageTag,
	}

	return (
		<html lang={localeLanguageTag} dir={isRtl ? 'rtl' : 'ltr'}>
			<head>
				<meta charset='utf-8' />
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1.0'
				/>
				<title>{title}</title>
				<meta
					name='description'
					content={description}
				/>
				<link rel='canonical' href={canonicalUrl} />
				<link
					rel='alternate'
					hrefLang='en'
					href={alternateLocaleUrls.en}
				/>
				<link
					rel='alternate'
					hrefLang='nb'
					href={alternateLocaleUrls.no}
				/>
				<link
					rel='alternate'
					hrefLang='he'
					href={alternateLocaleUrls.he}
				/>
				<link
					rel='alternate'
					hrefLang='x-default'
					href={`${siteOrigin}${pathSuffix}`}
				/>
				<meta name='robots' content='index, follow, max-snippet:-1' />
				<meta property='og:title' content={title} />
				<meta property='og:description' content={description} />
				<meta property='og:type' content='website' />
				<meta property='og:url' content={canonicalUrl} />
				<meta property='og:locale' content={localeLanguageTag} />
				<meta name='twitter:card' content='summary' />
				<meta name='twitter:title' content={title} />
				<meta name='twitter:description' content={description} />
				{assetHost
					? <link rel='dns-prefetch' href={`//${assetHost}`} />
					: null}
				{assetOrigin
					? <link rel='preconnect' href={assetOrigin} />
					: null}
				<link rel='icon' type='image/jpeg' href='/headshot.jpg' />
				<link rel='shortcut icon' href='/headshot.jpg' />
				<link rel='apple-touch-icon' href='/headshot.jpg' />
				<link
					rel='preload'
					href='/fonts/alef-400.ttf'
					as='font'
					type='font/ttf'
					crossOrigin='anonymous'
				/>
				<link
					rel='preload'
					href='/fonts/alef-700.ttf'
					as='font'
					type='font/ttf'
					crossOrigin='anonymous'
				/>
				<script
					type='application/ld+json'
					nonce={state.cspNonce}
					// deno-lint-ignore react-no-danger
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(personJsonLd),
					}}
				/>
				<script
					type='application/ld+json'
					nonce={state.cspNonce}
					// deno-lint-ignore react-no-danger
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(webSiteJsonLd),
					}}
				/>
				<script
					nonce={state.cspNonce}
					// deno-lint-ignore react-no-danger
					dangerouslySetInnerHTML={{
						__html:
							`(function(){var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}})();`,
					}}
				/>
			</head>
			<body>
				<Component />
			</body>
		</html>
	)
})
