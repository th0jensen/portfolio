import type { Project } from '~/lib/schemas.ts'

interface ProjectCardMediaProps {
	project: Project
	downloadAppStoreLabel: string
}

export default function ProjectCardMedia({
	project,
	downloadAppStoreLabel,
}: ProjectCardMediaProps) {
	const isZedImage = project.imageURL.endsWith('/zed.jpeg') ||
		project.imageURL.endsWith('/zed.webp')
	const appStoreBadgeUrl = '/api/images/appstore.svg'

	return (
		<div className='relative flex justify-center items-center h-[200px] overflow-hidden'>
			{project.source?.type === 'appstore' && (
				<div className='absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-b from-black/30 via-black/15 to-foreground/0'>
					<a
						href={project.source.link}
						className='hover:scale-105 transition-transform duration-300'
						target='_blank'
						rel='noopener noreferrer'
						aria-label={downloadAppStoreLabel}
					>
						<img
							src={appStoreBadgeUrl}
							alt='App Store'
							width={120}
							height={40}
							className='h-12 w-auto drop-shadow-md'
						/>
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
				height={isZedImage ? 150 : 180}
				className={`${
					isZedImage
						? 'h-[150px] rounded-xl overflow-hidden'
						: 'h-[180px]'
				} max-w-full object-contain transition-transform duration-500 group-hover:scale-105`}
			/>
			{project.status && (
				<div className='absolute top-0 right-0 m-3'>
					<div className='flex items-center gap-1.5 bg-foreground text-background text-xs py-1.5 px-3 font-semibold rounded-full'>
						{project.status}
					</div>
				</div>
			)}
		</div>
	)
}
