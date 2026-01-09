import { useSignal } from '@preact/signals'

interface ExpanderProps {
	description: string
	showMoreText?: string
	showLessText?: string
}

export default function ProjectCardExpander({
	description,
	showMoreText = 'Show more',
	showLessText = 'Show less',
}: ExpanderProps) {
	const isExpanded = useSignal(false)
	const shortDescription = description.length > 100
		? description.substring(0, 100) + '...'
		: description

	return (
		<div>
			{/* Description */}
			<div
				style={{ whiteSpace: 'pre-line' }}
				className={`text-sm text-muted-foreground ${
					isExpanded.value ? '' : 'h-[40px] overflow-hidden'
				}`}
			>
				{isExpanded.value ? description : shortDescription}
			</div>

			{/* Toggle button */}
			<div className='h-6 mt-1'>
				{description.length > 100 && (
					<button
						type='button'
						className='text-xs text-foreground/70 hover:text-foreground transition-colors'
						onClick={() => {
							isExpanded.value = !isExpanded.value
						}}
					>
						{isExpanded.value ? showLessText : showMoreText}
					</button>
				)}
			</div>
		</div>
	)
}
