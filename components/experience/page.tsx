import Layout from '~/components/ComponentLayout.tsx'
import SectionHeader from '~/components/SectionHeader.tsx'
import RepoCard from '~/components/experience/RepoCard.tsx'
import { getRepoUiLabels } from '~/components/experience/repoLabels.ts'
import { getBentoSize } from '~/components/experience/utils.ts'
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
	const labels = getRepoUiLabels(locale)

	return (
		<Layout id='experience'>
			<div className='container mx-auto max-w-6xl py-20'>
				<SectionHeader
					subtitle={t('common.experience.subtitle')}
					title={t('common.nav.experience')}
					description={t('common.experience.description')}
					titleClassName='text-3xl md:text-4xl font-bold tracking-tight'
				/>

				{repos.length > 0
					? (
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 md:auto-rows-[minmax(200px,auto)]'>
							{repos.map((repo, index) => (
								<RepoCard
									key={repo.url}
									repo={repo}
									size={getBentoSize(index)}
									labels={labels}
								/>
							))}
						</div>
					)
					: (
						<div className='text-center py-12 text-muted-foreground'>
							<p>{labels.loadingRepos}</p>
						</div>
					)}
			</div>
		</Layout>
	)
}
