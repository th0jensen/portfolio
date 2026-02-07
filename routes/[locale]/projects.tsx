import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import Work from '~/components/work/page.tsx'
import { localizedPageHandler } from '~/lib/locale_route.ts'
import { getPortfolioPageDataFromState } from '~/lib/page_data.ts'

export const handler = localizedPageHandler

export default define.page(function ProjectsPage(props) {
	const t = createTranslator(props.state.translationData || {})
	const { projects } = getPortfolioPageDataFromState(props.state)

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Work projects={projects} t={t} />
		</div>
	)
})
