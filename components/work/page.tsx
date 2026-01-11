import Layout from '~/components/ComponentLayout.tsx'
import type { Project } from '../../lib/schemas.ts'
import ProjectCard from '~/islands/ProjectCard.tsx'

interface WorkPageProps {
	projects: Project[]
	t: (key: string, params?: Record<string, string>) => string
}

export default function WorkPage({ projects, t }: WorkPageProps) {
	return (
		<Layout id='work'>
			<div className='container mx-auto max-w-6xl px-4 py-20 flex flex-col items-center'>
				<div className='w-full mb-12 flex flex-col'>
					<h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3'>
						{t('common.work.subtitle')}
					</h2>
					<h3 className='text-3xl font-bold tracking-tight'>
						{t('common.work.title')}
					</h3>
				</div>
				<div className='w-full'>
					<div className='flex flex-wrap' style={{ gap: '2rem' }}>
						{projects.map((project, index) => (
							<div
								key={index}
								className='w-full md:w-[calc(50%-1rem)]'
								style={{ alignSelf: 'flex-start' }}
							>
								<ProjectCard
									project={project}
									showMoreText={t('common.work.showMore')}
									showLessText={t('common.work.showLess')}
									visitProjectLabel={t(
										'common.work.visitProject',
										{ name: project.name },
									)}
									downloadAppStoreLabel={t(
										'common.work.downloadAppStore',
									)}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</Layout>
	)
}
