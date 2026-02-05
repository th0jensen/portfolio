import { define } from '~/utils.ts'
import HeroSection from '~/components/hero/section.tsx'
import WorkSection from '~/components/work/section.tsx'
import ExperienceSection from '~/components/experience/section.tsx'

export default define.page(async function Home(props) {
	const locale = props.state.locale || 'en'
	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<HeroSection locale={locale} />
			<WorkSection locale={locale} />
			<ExperienceSection locale={locale} />
		</div>
	)
})
