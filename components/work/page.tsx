import { Card, CardContent } from '~/components/ui/card.tsx'
import Layout from '~/components/ComponentLayout.tsx'
import { Badge } from '~/components/ui/badge.tsx'
import { ArrowUpRightIcon, Construction } from 'lucide-preact'
import type { Project } from '~/lib/data/types.ts'

export default function WorkPage({ projects }: { projects: Project[] }) {
	return (
		<Layout id='work'>
			<div className='container px-4 py-8 md:px-8 lg:px-16 justify-center items-center flex flex-col'>
				<h2 className='text-2xl font-bold mb-6 md:mb-8'>My Work</h2>
				<div className='flex flex-wrap gap-6 md:gap-8 max-w-[750px]'>
					{projects.map((project, index) => (
						<ProjectCard key={index} project={project} />
					))}
				</div>
			</div>
		</Layout>
	)
}

const ProjectCard = ({ project }: { project: Project }) => (
	<Card>
		<CardContent className='p-0'>
			<div className='flex flex-col sm:flex-row gap-4 p-4'>
				<div className='w-full sm:w-auto sm:flex-shrink-0'>
					<div className='relative aspect-square w-full sm:w-[250px] overflow-hidden rounded-lg flex justify-center items-center group'>
						{project.source?.type === 'appstore' && (
							<div className='z-10 w-full absolute inset-0 flex justify-center items-center overflow-hidden'>
								<div className='z-10 absolute rounded-full w-full h-full bg-gradient-radial from-black via-card to-card opacity-0 group-hover:opacity-60 transition-opacity duration-500 '>
								</div>
								<a
									href={project.source.link}
									className='z-20 relative hidden group-hover:block transition-transform duration-300 bg-transparent'
								>
									<img
										src='/appstore.svg'
										alt='App Store Image'
										className=''
									/>
								</a>
							</div>
						)}
						<img
							src={project.imageURL}
							alt={project.name}
							width={250}
							height={250}
							className='object-cover w-full h-full transition-transform duration-300 group-hover:scale-110'
						/>
						{project.status && (
							<div className='absolute bottom-0 left-0 right-0 h-1/4 bg-secondary flex items-center justify-center m-2 rounded-lg'>
								<Badge
									variant='secondary'
									className='text-xs flex items-center gap-2 font-semibold'
								>
									{/* Render Construction as a function instead of JSX component */}
									<span className='w-3 h-3'>
										{Construction &&
											Construction({ size: 12 })}
									</span>
									{project.status}
								</Badge>
							</div>
						)}
					</div>
				</div>
				<div className='flex-grow flex flex-col justify-center'>
					<CardHeader project={project} />
					<p className='text-sm text-muted-foreground mb-8'>
						{project.description}
					</p>
					<div className='flex justify-start flex-wrap gap-2'>
						{Object.keys(project.technologies).map((
							tech,
							index,
						) => (
							<Badge
								key={index}
								variant='outline'
								className='text-xs'
								style={`background-color: ${
									project.technologies[tech]
								}`}
							>
								{tech}
							</Badge>
						))}
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

const CardHeader = ({ project }: { project: Project }) => {
	return (
		<a
			href={project.source?.link}
			className={`flex text-lg font-bold mb-2 items-center ${
				project.source ? 'hover:underline' : ''
			}`}
		>
			{project.name}
			{project.source?.link && (
				<span>
					{ArrowUpRightIcon && ArrowUpRightIcon({ size: 16 })}
				</span>
			)}
		</a>
	)
}
