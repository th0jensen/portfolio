import { Link } from '~/components/ui/button.tsx'

interface NavItemProps {
	href?: string
	label: string
	className?: string
	onClick?: () => void
	target?: string
	rel?: string
}

export default function NavItem(
	{ href, label, className = '', onClick, target, rel }: NavItemProps,
) {
	return (
		<Link
			variant='ghost'
			size='sm'
			href={href || '#'}
			className={className}
			onClick={onClick}
			target={target}
			rel={rel}
		>
			{label}
		</Link>
	)
}
