import Layout from '~/components/ComponentLayout.tsx'
import SectionHeader from '~/components/SectionHeader.tsx'
import ExperienceRepos from '~/islands/ExperienceRepos.tsx'
import type { FormattedRepo } from '~/lib/schemas.ts'

interface ExperiencePageProps {
	repos?: FormattedRepo[]
	t: (key: string, params?: Record<string, string>) => string
	locale: string
}

export default function ExperiencePage({
	repos = [],
	t,
	locale,
}: ExperiencePageProps) {
	return (
		<Layout id='experience'>
			<div className='container mx-auto max-w-6xl py-20'>
				<SectionHeader
					subtitle={t('common.experience.subtitle')}
					title={t('common.nav.experience')}
					description={t('common.experience.description')}
					titleClassName='text-3xl md:text-4xl font-bold tracking-tight'
				/>
				<ExperienceRepos initialRepos={repos} locale={locale} />
			</div>
		</Layout>
	)
}
