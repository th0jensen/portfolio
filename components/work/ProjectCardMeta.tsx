import type { Project } from '~/lib/schemas.ts'

interface ProjectCardMetaProps {
	project: Project
	featured?: boolean
	demoHref?: string
	visitProjectLabel?: string
}

export default function ProjectCardMeta({
	project,
	featured = false,
	demoHref,
	visitProjectLabel,
}: ProjectCardMetaProps) {
	const isDemoProject = project.source?.type === 'demo' && Boolean(demoHref)
	const titleClassName = featured ? 'text-lg md:text-2xl' : 'text-lg'
	const descriptionClassName = featured ? 'text-sm md:text-base' : 'text-sm'

	return (
		<>
			{!project.source || isDemoProject
				? (
					<h3 className={`${titleClassName} font-semibold`}>
						{project.name}
					</h3>
				)
				: (
					<a
						href={project.source?.link}
						className={`group inline-flex items-center gap-1 ${titleClassName} font-semibold transition-colors hover:text-primary/80 hover:underline`}
						target='_blank'
						rel='noopener noreferrer'
						aria-label={visitProjectLabel ||
							`Visit ${project.name} project`}
					>
						{project.name}
					</a>
				)}
			<p
				className={`${descriptionClassName} text-muted-foreground leading-relaxed whitespace-pre-line ${
					featured ? 'max-w-2xl' : 'flex-1'
				}`}
			>
				{project.description}
			</p>
		</>
	)
}
