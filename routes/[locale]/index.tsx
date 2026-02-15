import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import Hero from '~/components/hero/page.tsx'
import { getPortfolioPageDataFromState } from '~/lib/page_data.ts'

export default define.page(function Home(props) {
	const t = createTranslator(props.state.translationData || {})
	const { locale, about } = getPortfolioPageDataFromState(props.state)
	const workHref = `/${locale}/projects`

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Hero about={about} t={t} workHref={workHref} />
		</div>
	)
})
