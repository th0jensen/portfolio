import { define } from '../utils.ts'
import { createTranslator } from 'fresh-i18n'
import Header from '~/islands/Header.tsx'
import Footer from '~/components/Footer.tsx'
import { toApiAssetUrl } from '~/lib/assets.ts'

export default define.layout(function Layout({ Component, state }) {
	const PageComponent = Component
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
		resume: t('common.buttons.resume'),
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
				resumeHref={toApiAssetUrl('/resume.pdf')}
			/>
			<div class='site-page-content flex flex-1 flex-col transition-opacity duration-200'>
				<main class='flex-1'>
					<PageComponent />
				</main>
				<Footer t={t} />
			</div>
		</div>
	)
})
