import type { Project } from '~/lib/schemas.ts'
import ProjectCardMedia from '~/components/work/ProjectCardMedia.tsx'
import ProjectCardMeta from '~/components/work/ProjectCardMeta.tsx'
import ProjectTechList from '~/components/work/ProjectTechList.tsx'

interface ProjectCardProps {
	project: Project
	locale: string
	visitProjectLabel?: string
	downloadAppStoreLabel?: string
}

function buildDemoHref(sourceLink: string, locale: string): string | undefined {
	try {
		const url = new URL(sourceLink)
		const slug = url.pathname.split('/').filter(Boolean).pop()
		if (!slug) return undefined
		return `/${locale}/projects/${slug}`
	} catch {
		return undefined
	}
}

export default function ProjectCard({
	project,
	locale,
	visitProjectLabel,
	downloadAppStoreLabel = 'Download on App Store',
}: ProjectCardProps) {
	const demoHref = project.source?.type === 'demo' && project.source.link
		? buildDemoHref(project.source.link, locale)
		: undefined

	return (
		<div className='group glass-card overflow-hidden rounded-2xl smooth-transition hover:shadow-lg h-full flex flex-col'>
			<ProjectCardMedia
				project={project}
				demoHref={demoHref}
				visitProjectLabel={visitProjectLabel}
				downloadAppStoreLabel={downloadAppStoreLabel}
			/>
			<div className='p-5 space-y-4 flex-1 flex flex-col'>
				<ProjectCardMeta
					project={project}
					demoHref={demoHref}
					visitProjectLabel={visitProjectLabel}
				/>
				<ProjectTechList technologies={project.technologies} />
			</div>
		</div>
	)
}
