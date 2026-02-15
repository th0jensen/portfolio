import type { Project } from '~/lib/schemas.ts'

interface ProjectCardMetaProps {
	project: Project
	demoHref?: string
	visitProjectLabel?: string
}

export default function ProjectCardMeta({
	project,
	demoHref,
	visitProjectLabel,
}: ProjectCardMetaProps) {
	const isDemoProject = project.source?.type === 'demo' && Boolean(demoHref)

	return (
		<>
			{!project.source || isDemoProject
				? <h3 className='text-lg font-semibold'>{project.name}</h3>
				: (
					<a
						href={project.source?.link}
						className='group inline-flex items-center gap-1 text-lg font-semibold transition-colors hover:text-primary/80 hover:underline'
						target='_blank'
						rel='noopener noreferrer'
						aria-label={visitProjectLabel ||
							`Visit ${project.name} project`}
					>
						{project.name}
					</a>
				)}
			<p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-line flex-1'>
				{project.description}
			</p>
		</>
	)
}
