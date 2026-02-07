import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'
import Header from '~/components/header/Header.tsx'
import Footer from '~/components/Footer.tsx'

export default define.page(function Layout({ Component, state }) {
	const t = createTranslator(state.translationData || {})
	const locale = state.locale || 'en'
	const isRtl = locale === 'he'
	const requestPath = typeof state.requestPath === 'string'
		? state.requestPath
		: `/${locale}`

	const headerTranslations = {
		work: t('common.nav.work'),
		experience: t('common.nav.experience'),
		contact: t('common.nav.contact'),
		openMenu: t('common.nav.openMenu'),
		closeMenu: t('common.nav.closeMenu'),
		themeLight: t('common.theme.light'),
		themeDark: t('common.theme.dark'),
		name: t('common.metadata.name'),
	}

	return (
		<div class='flex min-h-screen flex-col' dir={isRtl ? 'rtl' : 'ltr'}>
			<Header
				translations={headerTranslations}
				locale={locale}
				currentPath={requestPath}
			/>
			<main class='flex-1'>
				<Component />
			</main>
			<Footer t={t} />
		</div>
	)
})
