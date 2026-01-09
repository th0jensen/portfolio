import type { Project } from '~/lib/data/types.ts'
import ProjectCardExpander from '~/islands/ProjectCardExpander.tsx'

interface ProjectCardProps {
	project: Project
	showMoreText?: string
	showLessText?: string
	visitProjectLabel?: string
	downloadAppStoreLabel?: string
}

export default function ProjectCard({
	project,
	showMoreText = 'Show more',
	showLessText = 'Show less',
	visitProjectLabel,
	downloadAppStoreLabel = 'Download on App Store',
}: ProjectCardProps) {
	return (
		<div className='group glass-card overflow-hidden rounded-2xl smooth-transition hover:shadow-lg'>
			<div className='relative flex justify-center items-center h-[200px] overflow-hidden'>
				{project.source?.type === 'appstore' && (
					<div className='absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/30 via-black/15 to-foreground/0'>
						<a href={project.source.link} className='hover:scale-105 transition-transform duration-300' target='_blank' rel='noopener noreferrer' aria-label={downloadAppStoreLabel}>
							<img src='/appstore.svg' alt='App Store' width={120} height={40} className='h-12 w-auto drop-shadow-md' />
						</a>
					</div>
				)}
				{project.source?.type === 'github' && (
					<div className='absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/30 via-black/15 to-foreground/0' />
				)}
				<img
					src={project.imageURL}
					alt={project.name}
					width={300}
					height={project.imageURL === '/images/zed.jpeg' ? 150 : 180}
					className={`${project.imageURL === '/images/zed.jpeg' ? 'h-[150px] rounded-xl overflow-hidden' : 'h-[180px]'} max-w-full object-contain transition-transform duration-500 group-hover:scale-105`}
				/>
				{project.status && (
					<div className='absolute top-0 right-0 m-3'>
						<div className='flex items-center gap-1.5 bg-foreground text-background text-xs py-1.5 px-3 font-semibold rounded-full'>{project.status}</div>
					</div>
				)}
			</div>
			<div className='p-5 space-y-4 flex-1 flex flex-col'>
				{!project.source
					? <h3 className='text-lg font-semibold'>{project.name}</h3>
					: <a href={project.source?.link} className='group inline-flex items-center gap-1 text-lg font-semibold transition-colors hover:text-primary/80 hover:underline' target='_blank' rel='noopener noreferrer' aria-label={visitProjectLabel || `Visit ${project.name} project`}>{project.name}</a>
				}
				<div>
					<ProjectCardExpander description={project.description} showMoreText={showMoreText} showLessText={showLessText} />
				</div>
				<div className='flex flex-wrap gap-2 pt-2'>
					{Object.keys(project.technologies).map((tech, index) => (
						<div key={index} className='text-xs py-1.5 px-3 bg-accent/50 text-accent-foreground font-semibold rounded-lg smooth-transition hover:bg-accent/70'>{tech}</div>
					))}
				</div>
			</div>
		</div>
	)
}
