import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import ThemeButton from '~/components/ui/ThemeButton.tsx'

interface ThemeToggleProps {
	className?: string
	showText?: boolean
	lightText: string
	darkText: string
}

export default function ThemeToggle({
	className,
	showText = false,
	lightText,
	darkText,
}: ThemeToggleProps) {
	const theme = useSignal<'light' | 'dark'>('dark')

	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') as
			| 'light'
			| 'dark'
			| null
		if (savedTheme) {
			theme.value = savedTheme
			if (savedTheme === 'dark') {
				document.documentElement.classList.add('dark')
			}
		} else {
			theme.value = 'dark'
			document.documentElement.classList.add('dark')
		}
	}, [])

	const toggleTheme = () => {
		const newTheme = theme.value === 'light' ? 'dark' : 'light'
		theme.value = newTheme
		localStorage.setItem('theme', newTheme)
		if (newTheme === 'dark') {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	return (
		<ThemeButton
			onClick={toggleTheme}
			theme={theme.value}
			showText={showText}
			className={className}
			lightText={lightText}
			darkText={darkText}
		/>
	)
}
