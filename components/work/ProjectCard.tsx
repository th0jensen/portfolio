import type { Project } from '~/lib/schemas.ts'
import ProjectCardMedia from '~/components/work/ProjectCardMedia.tsx'
import ProjectCardMeta from '~/components/work/ProjectCardMeta.tsx'
import ProjectTechList from '~/components/work/ProjectTechList.tsx'

interface ProjectCardProps {
	project: Project
	visitProjectLabel?: string
	downloadAppStoreLabel?: string
}

export default function ProjectCard({
	project,
	visitProjectLabel,
	downloadAppStoreLabel = 'Download on App Store',
}: ProjectCardProps) {
	return (
		<div className='group glass-card overflow-hidden rounded-2xl smooth-transition hover:shadow-lg h-full flex flex-col'>
			<ProjectCardMedia
				project={project}
				downloadAppStoreLabel={downloadAppStoreLabel}
			/>
			<div className='p-5 space-y-4 flex-1 flex flex-col'>
				<ProjectCardMeta
					project={project}
					visitProjectLabel={visitProjectLabel}
				/>
				<ProjectTechList technologies={project.technologies} />
			</div>
		</div>
	)
}
