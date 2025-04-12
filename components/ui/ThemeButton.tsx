import SunIcon from '~/components/ui/icons/SunIcon.tsx'
import MoonIcon from '~/components/ui/icons/MoonIcon.tsx'
import { Button } from '~/components/ui/button.tsx'

interface ThemeToggleProps {
	onClick: () => void
	theme: 'light' | 'dark'
	className?: string
}

export default function ThemeToggle({ onClick, theme, className }: ThemeToggleProps) {
	return (
		<Button
			variant='ghost'
			size='sm'
			onClick={onClick}
			className={`flex items-center justify-end gap-2 ${className}`}
			aria-label={`Switch to ${
				theme === 'light' ? 'dark' : 'light'
			} mode`}
		>
			<span className="whitespace-nowrap">Switch to {theme === 'light' ? 'dark' : 'light'} mode</span>
			{theme === 'light' ? <MoonIcon /> : <SunIcon />}
		</Button>
	)
}
