import Layout from '~/components/ComponentLayout.tsx'
import type { Project } from '~/lib/data/types.ts'
import ProjectCard from '~/islands/ProjectCard.tsx'

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
				<div className='w-full'>
					<div className='flex flex-wrap' style={{gap: '2rem'}}>
						{projects.map((project, index) => (
							<div 
								key={index}
								className='w-full md:w-[calc(50%-1rem)]'
								style={{alignSelf: 'flex-start'}}
							>
								<ProjectCard project={project} />
							</div>
						))}
					</div>
				</div>
			</div>
		</Layout>
	)
}

// All the ProjectCard code has been moved to its own island component
