import SunIcon from '~/components/ui/icons/SunIcon.tsx'
import MoonIcon from '~/components/ui/icons/MoonIcon.tsx'
import { Button } from '~/components/ui/button.tsx'

interface ThemeToggleProps {
	onClick: () => void
	theme: 'light' | 'dark'
	className?: string
	showText?: boolean
	lightText?: string
	darkText?: string
	type?: 'button' | 'submit' | 'reset'
}

export default function ThemeToggle({
	onClick,
	theme,
	className = '',
	showText = false,
	lightText = 'Light',
	darkText = 'Dark',
	type = 'button',
}: ThemeToggleProps) {
	const targetMode = theme === 'light' ? darkText : lightText

	return (
		<Button
			variant='ghost'
			size='sm'
			type={type}
			onClick={onClick}
			className={`flex items-center justify-end gap-2 ${className}`}
			aria-label={`Switch to ${targetMode} mode`}
		>
			{showText && <span className="whitespace-nowrap">{targetMode}</span>}
			{theme === 'light' ? <MoonIcon /> : <SunIcon />}
		</Button>
	)
}
