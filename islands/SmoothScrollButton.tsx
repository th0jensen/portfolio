import { Button } from '~/components/ui/button.tsx'
import { smoothScrollTo } from '~/lib/utils/smoothScroll.ts'

interface SmoothScrollButtonProps {
	targetId: string
	className?: string
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link'
	size?: 'default' | 'sm' | 'lg' | 'icon'
	children: preact.ComponentChildren
}

export default function SmoothScrollButton({
	targetId,
	className = '',
	variant = 'default',
	size = 'default',
	children,
}: SmoothScrollButtonProps) {
	return (
		<Button
			className={className}
			variant={variant}
			size={size}
			onClick={() => smoothScrollTo(targetId)}
		>
			{children}
		</Button>
	)
}
