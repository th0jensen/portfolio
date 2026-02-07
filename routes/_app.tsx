import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'

export default define.page(function App({ Component, state }) {
	const t = createTranslator(state.translationData || {})
	const locale = state.locale || 'en'
	const assetOrigin = typeof state.assetOrigin === 'string'
		? state.assetOrigin
		: ''
	const assetHost = assetOrigin ? new URL(assetOrigin).host : ''
	const resolvedTitle = t('common.metadata.name')
	const resolvedDescription = t('common.metadata.description')
	const title = resolvedTitle === 'common.metadata.name'
		? 'Thomas Jensen'
		: resolvedTitle
	const description = resolvedDescription === 'common.metadata.description'
		? 'Thomas Jensen - Full Stack Software Developer focused on creating elegant solutions through clean code. Explore my projects and experience.'
		: resolvedDescription

	return (
		<html lang={locale}>
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
				<meta name='robots' content='index, follow, max-snippet:-1' />
				<meta property='og:title' content={title} />
				<meta property='og:description' content={description} />
				<meta property='og:type' content='website' />
				<meta name='twitter:card' content='summary' />
				<meta name='twitter:title' content={title} />
				<meta name='twitter:description' content={description} />
				{assetHost
					? <link rel='dns-prefetch' href={`//${assetHost}`} />
					: null}
				{assetOrigin
					? <link rel='preconnect' href={assetOrigin} />
					: null}
				<link rel='icon' type='image/svg+xml' href='/favicon.svg' />
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
