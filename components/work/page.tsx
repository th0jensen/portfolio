import Layout from '~/components/ComponentLayout.tsx'
import type { Project } from '../../lib/schemas.ts'
import SectionHeader from '~/components/SectionHeader.tsx'
import ProjectGrid from '~/components/work/ProjectGrid.tsx'

interface WorkPageProps {
	projects: Project[]
	locale: string
	t: (key: string, params?: Record<string, string>) => string
}

export default function WorkPage({ projects, locale, t }: WorkPageProps) {
	return (
		<Layout id='work'>
			<div className='container mx-auto max-w-6xl py-20 flex flex-col items-center'>
				<SectionHeader
					subtitle={t('common.work.subtitle')}
					title={t('common.nav.work')}
					containerClassName='w-full mb-12'
				/>
				<div className='w-full'>
					<ProjectGrid
						projects={projects}
						locale={locale}
						visitProjectLabel={(name) =>
							t('common.work.visitProject', { name })}
						downloadAppStoreLabel={t(
							'common.work.downloadAppStore',
						)}
					/>
				</div>
			</div>
		</Layout>
	)
}
