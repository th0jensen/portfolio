import { useEffect } from 'preact/hooks'
import { Button } from '~/components/ui/button.tsx'
import { useSignal } from '@preact/signals'
import NavItem from '~/islands/NavItem.tsx'

export default function Header() {
	const displayNav = useSignal<boolean>(false)
	const theme = useSignal<'light' | 'dark'>('light')

	useEffect(() => {
		if (
			globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches
		) {
			theme.value = 'dark'
			document.documentElement.classList.add('dark')
		}

		globalThis.window.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener(
				'change',
				(event) => {
					const newTheme = event.matches ? 'dark' : 'light'
					theme.value = newTheme
					if (event.matches) {
						document.documentElement.classList.add('dark')
					} else {
						document.documentElement.classList.remove('dark')
					}
				},
			)
	}, [])

	const toggleTheme = () => {
		const newTheme = theme.value === 'light' ? 'dark' : 'light'
		theme.value = newTheme
		if (newTheme === 'dark') {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	const handleNavLinkClick = () => {
		// Close mobile nav if open
		displayNav.value = false
	}

	const navLinks = [
		{ id: 'work', label: 'Work' },
		{ id: 'experience', label: 'Experience' },
		// { id: 'projects', label: 'Projects' },
		{ href: 'mailto:thomas.jensen_@outlook.com', label: 'Contact' },
	]

	return (
		<header className='fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/5 bg-background/80 backdrop-blur-md'>
			<div className='container mx-auto flex h-full max-w-6xl items-center justify-between px-4'>
				{/* Logo/Name */}
				<div className='flex items-center z-10'>
					<NavItem
						id='hero'
						label='Thomas Jensen'
						className='font-medium tracking-tight text-lg'
					/>
				</div>

				{/* Mobile menu button */}
				<div className='md:hidden'>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => displayNav.value = !displayNav.value}
						className='focus:ring-0'
						aria-label={displayNav.value
							? 'Close menu'
							: 'Open menu'}
					>
						{!displayNav.value ? <p>🍔</p> : <p>❌</p>}
					</Button>
				</div>

				{/* Desktop Navigation */}
				<nav className='hidden md:flex md:items-center md:space-x-1'>
					{navLinks.map((link) => (
						<NavItem
							key={link.id || link.href}
							id={link.id}
							href={link.href}
							label={link.label}
							className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'
						/>
					))}
					<ThemeToggle
						onClick={toggleTheme}
						theme={theme.value}
						className='ml-2 h-9 w-9 rounded-full'
					/>
				</nav>

				{/* Mobile Navigation Menu */}
				{displayNav.value && (
					<div className='absolute inset-x-0 top-16 z-50 bg-background/95 p-4 backdrop-blur-md shadow-lg border-b border-border/10 md:hidden'>
						<nav className='flex flex-col space-y-4'>
							<div className='flex flex-col items-center gap-4'>
								{navLinks.map((link) => (
									<NavItem
										key={link.id || link.href}
										id={link.id}
										href={link.href}
										label={link.label}
										className='flex items-center justify-center h-10 w-36 text-sm font-medium'
										onClick={handleNavLinkClick}
									/>
								))}
							</div>
							<div className='border-t border-border/10 pt-4 flex items-center justify-end'>
								<div className='flex items-center'>
									<span className='text-sm text-muted-foreground mr-2'>
										Switch theme
									</span>
									<ThemeToggle
										onClick={toggleTheme}
										theme={theme.value}
										className='h-10 w-10 rounded-full'
									/>
								</div>
							</div>
						</nav>
					</div>
				)}
			</div>
		</header>
	)
}

interface ThemeToggleProps {
	onClick: () => void
	theme: 'light' | 'dark'
	className?: string
}

function ThemeToggle({ onClick, theme, className }: ThemeToggleProps) {
	return (
		<Button
			variant='ghost'
			size='icon'
			onClick={onClick}
			className={className}
			aria-label={`Switch to ${
				theme === 'light' ? 'dark' : 'light'
			} mode`}
		>
			{theme === 'light' ? <p>🌚</p> : <p>🌞</p>}
		</Button>
	)
}
