import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import Experience from '~/components/experience/page.tsx'
import {
	getPortfolioPageDataFromState,
	getPortfolioRepos,
} from '~/lib/page_data.ts'

export default define.page(async function ExperienceRoutePage(props) {
	const t = createTranslator(props.state.translationData || {})
	const repos = await getPortfolioRepos()
	const { locale } = getPortfolioPageDataFromState(props.state)

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Experience repos={repos} t={t} locale={locale} />
		</div>
	)
})
