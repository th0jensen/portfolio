interface SectionHeaderProps {
	subtitle: string
	title: string
	description?: string
	titleClassName?: string
	containerClassName?: string
}

export default function SectionHeader({
	subtitle,
	title,
	description,
	titleClassName = 'text-3xl font-bold tracking-tight',
	containerClassName = 'mb-12',
}: SectionHeaderProps) {
	return (
		<div className={containerClassName}>
			<h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3'>
				{subtitle}
			</h2>
			<h3 className={titleClassName}>{title}</h3>
			{description && (
				<p className='text-muted-foreground/90 leading-relaxed max-w-2xl mt-4'>
					{description}
				</p>
			)}
		</div>
	)
}
