import { Button, Link } from '~/components/ui/button.tsx'
import { smoothScrollTo } from '~/lib/utils/smoothScroll.ts'

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
	// Handle navigation with smooth scroll
	const handleClick = () => {
		if (id) {
			// If we have an ID, scroll to it
			smoothScrollTo(id)
			// If there's an additional onClick handler, call it (e.g., to close mobile menu)
			if (onClick) onClick()
		}
	}

	// If it's an internal link (with an id for smooth scrolling)
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

	// If it's an external link (e.g., mailto:)
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
