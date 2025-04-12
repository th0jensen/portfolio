import type { Project } from '~/lib/data/types.ts'
import ProjectCardExpander from '~/islands/ProjectCardExpander.tsx'

export default function ProjectCard({ project }: { project: Project }) {

  return (
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
        {project.source?.type === 'github' && (
          <div className='absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/30 via-black/15 to-foreground/0'>
          </div>
        )}
        <img
          src={project.imageURL}
          alt={project.name}
          className={`${
            project.imageURL === '/images/zed.jpeg'
              ? 'h-[150px] rounded-xl overflow-hidden'
              : 'h-[180px]'
          } max-w-full object-contain transition-transform duration-500 group-hover:scale-105`}
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
      <div className='p-5 space-y-4 flex-1 flex flex-col'>
        {/* Project Title */}
        {!project.source ? (
          <h3 className='text-lg font-semibold'>{project.name}</h3>
        ) : (
          <a
            href={project.source?.link}
            className='group inline-flex items-center gap-1 text-lg font-semibold transition-colors hover:text-primary/80 hover:underline'
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`Visit ${project.name} project`}
          >
            {project.name}
          </a>
        )}

        {/* Project Description */}
        <div>
          <ProjectCardExpander description={project.description} />
        </div>

        {/* Technologies */}
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

      {/* Project card body ends here */}
    </div>
  )
}