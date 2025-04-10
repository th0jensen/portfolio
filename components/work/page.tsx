import Layout from '~/components/ComponentLayout.tsx'
import type { Project } from '~/lib/data/types.ts'
import { useSignal } from '@preact/signals'

export default function WorkPage({ projects }: { projects: Project[] }) {
	return (
		<Layout id='work'>
			<div className='container mx-auto max-w-6xl px-4 py-20 flex flex-col items-center'>
				<div className='w-full mb-12 flex flex-col'>
					<h2 className='text-sm font-medium tracking-wider text-muted-foreground uppercase mb-2'>
						Featured Works
					</h2>
					<h3 className='text-3xl font-bold'>My Projects</h3>
				</div>
				<div className='grid w-full gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2'>
					{projects.map((project, index) => (
						<ProjectCard key={index} project={project} />
					))}
				</div>
			</div>
		</Layout>
	)
}

const ProjectCard = ({ project }: { project: Project }) => (
	<div className='group bg-foreground/5 overflow-hidden rounded-xl'>
		{/* Project Image */}
		<div className='relative flex justify-center items-center h-[200px] overflow-hidden'>
			{/* App Store overlay */}
			{project.source?.type === 'appstore' && (
				<div className='absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/30 via-black/15 to-foreground/0'>
					<a
						href={project.source.link}
						className='hover:scale-105 transition-transform duration-300'
						target='_blank'
						rel='noopener noreferrer'
						aria-label='Download on App Store'
					>
						<img
							src='/appstore.svg'
							alt='App Store'
							className='h-12 w-auto drop-shadow-md'
						/>
					</a>
				</div>
			)}
			<img
				src={project.imageURL}
				alt={project.name}
				className='max-h-[180px] max-w-full object-contain transition-transform duration-500 group-hover:scale-105'
			/>
			{project.status && (
				<div className='absolute top-0 right-0 m-3'>
					<div className='flex items-center gap-1.5 bg-foreground text-background text-xs py-1 px-3 font-medium'>
						{project.status}
					</div>
				</div>
			)}
		</div>

		{/* Project Details */}
		<div className='p-5 space-y-4'>
			<ProjectTitle project={project} />

			<ProjectDescription description={project.description} />

			<div className='flex flex-wrap gap-2 pt-2'>
				{Object.keys(project.technologies).map((tech, index) => (
					<div
						key={index}
						className='text-xs py-1 px-2 bg-foreground/5 text-foreground/80 font-medium'
					>
						{tech}
					</div>
				))}
			</div>
		</div>
	</div>
)

const ProjectDescription = ({ description }: { description: string }) => {
	const expanded = useSignal(true)
	const shortDescription = description.length > 100
		? description.substring(0, 100) + '...'
		: description

	return (
		<div>
			<div
				className={`text-sm text-muted-foreground h-[40px] overflow-hidden`}
			>
				{expanded.value ? description : shortDescription}
			</div>
			{
				/* {description.length > 100 && (
				<button
					className='text-xs text-foreground/70 mt-1 hover:text-foreground transition-colors'
					onClick={() => expanded.value = !expanded.value}
				>
					{expanded.value ? 'Show less' : 'See more'}
				</button>
			)} */
			}
		</div>
	)
}

const ProjectTitle = ({ project }: { project: Project }) => {
	if (!project.source) {
		return <h3 className='text-lg font-semibold'>{project.name}</h3>
	}

	return (
		<a
			href={project.source?.link}
			className='group inline-flex items-center gap-1 text-lg font-semibold transition-colors hover:text-primary/80 hover:underline'
			target='_blank'
			rel='noopener noreferrer'
			aria-label={`Visit ${project.name} project`}
		>
			{project.name}
			{/* <ArrowUpRightIcon className='h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' /> */}
		</a>
	)
}
