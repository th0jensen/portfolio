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
			<div className='container mx-auto max-w-6xl py-20 flex flex-col items-center'>
				<div className='w-full mb-12 flex flex-col'>
					<h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3'>
						{t('common.work.subtitle')}
					</h2>
					<h3 className='text-3xl font-bold tracking-tight'>
						{t('common.nav.work')}
					</h3>
				</div>
				<div className='w-full'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch'>
						{projects.map((project, index) => (
							<div key={index} className='w-full h-full'>
								<ProjectCard
									project={project}
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
