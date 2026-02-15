import { Link } from '~/components/ui/button.tsx'

interface NavItemProps {
	href?: string
	label: string
	className?: string
	onClick?: () => void
}

export default function NavItem(
	{ href, label, className = '', onClick }: NavItemProps,
) {
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
