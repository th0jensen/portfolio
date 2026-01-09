import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'

export default define.page(function App({ Component, state }) {
	const t = createTranslator(state.translationData || {})
	const locale = state.locale || 'en'
	const title = locale === 'he'
		? t('common.about.firstName') + ' ' + t('common.about.lastName')
		: 'Thomas Jensen'

	return (
		<html lang={locale}>
			<head>
				<meta charset='utf-8' />
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1.0'
				/>
				<title>{title}</title>
				<meta name='description' content={t('common.meta.description')} />
				<link rel='icon' type='image/svg+xml' href='/favicon.svg' />
				{/* Preconnect to Google Fonts for faster font loading */}
				<link rel='preconnect' href='https://fonts.googleapis.com' />
				<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
				{/* Load fonts directly in head to avoid chaining through CSS */}
				<link
					rel='stylesheet'
					href='https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap'
				/>
				<script dangerouslySetInnerHTML={{
					__html: `
						(function() {
							var theme = localStorage.getItem('theme');
							if (theme === 'dark') {
								document.documentElement.classList.add('dark');
							}
						})();
					`
				}} />
			</head>
			<body>
				<Component />
			</body>
		</html>
	)
})
