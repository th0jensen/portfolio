interface ProjectTechListProps {
	technologies: Record<string, string>
}

export default function ProjectTechList({ technologies }: ProjectTechListProps) {
	return (
		<div className='flex flex-wrap gap-2 pt-2'>
			{Object.keys(technologies).map((tech, index) => (
				<div
					key={index}
					className='text-xs py-1.5 px-3 bg-accent/50 text-accent-foreground font-semibold rounded-lg smooth-transition hover:bg-accent/70'
				>
					{tech}
				</div>
			))}
		</div>
	)
}
