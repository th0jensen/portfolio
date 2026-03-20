import type { Project } from '~/lib/schemas.ts'
import ProjectCardMedia from '~/components/work/ProjectCardMedia.tsx'
import ProjectCardMeta from '~/components/work/ProjectCardMeta.tsx'
import ProjectTechList from '~/components/work/ProjectTechList.tsx'

interface ProjectCardProps {
	project: Project
	locale: string
	featured?: boolean
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
	featured = false,
	visitProjectLabel,
	downloadAppStoreLabel = 'Download on App Store',
}: ProjectCardProps) {
	const demoHref = project.source?.type === 'demo' && project.source.link
		? buildDemoHref(project.source.link, locale)
		: undefined

	return (
		<div
			className={`group glass-card rounded-2xl smooth-transition h-full ${
				featured
					? 'flex flex-col md:flex-row md:min-h-[340px] hover:shadow-lg'
					: 'flex flex-col overflow-hidden hover:shadow-lg'
			}`}
		>
			<div
				className={featured
					? 'overflow-hidden rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none md:w-[34%] md:flex-shrink-0'
					: ''}
			>
				<ProjectCardMedia
					project={project}
					featured={featured}
					demoHref={demoHref}
					visitProjectLabel={visitProjectLabel}
					downloadAppStoreLabel={downloadAppStoreLabel}
				/>
			</div>
			<div
				className={`p-5 space-y-4 flex-1 flex flex-col ${
					featured
						? 'md:w-[66%] md:px-7 md:py-8 md:justify-center'
						: ''
				}`}
			>
				<ProjectCardMeta
					project={project}
					featured={featured}
					demoHref={demoHref}
					visitProjectLabel={visitProjectLabel}
				/>
				<ProjectTechList technologies={project.technologies} />
			</div>
		</div>
	)
}
