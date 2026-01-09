import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'

export default define.page(function App({ Component, state }) {
	const t = createTranslator(state.translationData || {})
	const locale = state.locale || 'en'
	const title = locale === 'he'
		? t('common.about.firstName') + ' ' + t('common.about.lastName')
		: 'Thomas Jensen'

	return (
		<html>
			<head>
				<meta charset='utf-8' />
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1.0'
				/>
				<title>{title}</title>
				<link rel='icon' type='image/svg+xml' href='/favicon.svg' />
			</head>
			<body>
				<Component />
			</body>
		</html>
	)
})
