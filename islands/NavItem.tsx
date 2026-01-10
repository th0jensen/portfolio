import { Button, Link } from '~/components/ui/button.tsx'
import { smoothScrollTo } from '~/lib/smoothScroll.ts'

interface NavItemProps {
	id?: string
	href?: string
	label: string
	className?: string
	onClick?: () => void
}

export default function NavItem(
	{ id, href, label, className = '', onClick }: NavItemProps,
) {
	const handleClick = () => {
		if (id) {
			smoothScrollTo(id)
			if (onClick) onClick()
		}
	}

	if (id) {
		return (
			<Button
				variant='ghost'
				size='sm'
				onClick={handleClick}
				className={className}
			>
				{label}
			</Button>
		)
	}

	return (
		<Link
			variant='ghost'
			size='sm'
			href={href || '#'}
			className={className}
			onClick={onClick}
		>
			{label}
		</Link>
	)
}
