import type { Project } from '~/lib/schemas.ts'
import ProjectCard from '~/components/work/ProjectCard.tsx'

interface ProjectGridProps {
	projects: Project[]
	locale: string
	visitProjectLabel: (name: string) => string
	downloadAppStoreLabel: string
}

export default function ProjectGrid({
	projects,
	locale,
	visitProjectLabel,
	downloadAppStoreLabel,
}: ProjectGridProps) {
	return (
		<div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch'>
			{projects.map((project, index) => (
				<div key={index} className='w-full h-full'>
					<ProjectCard
						project={project}
						locale={locale}
						visitProjectLabel={visitProjectLabel(project.name)}
						downloadAppStoreLabel={downloadAppStoreLabel}
					/>
				</div>
			))}
		</div>
	)
}
