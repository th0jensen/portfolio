import { Button } from '~/components/ui/button.tsx'
import { useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import NavItem from '~/islands/NavItem.tsx'
import ThemeToggle from '~/components/ui/ThemeButton.tsx'
import HamburgerIcon from '~/components/ui/icons/HamburgerIcon.tsx'
import CloseIcon from '~/components/ui/icons/CloseIcon.tsx'

interface HeaderTranslations {
	work: string
	experience: string
	contact: string
	openMenu: string
	closeMenu: string
	themeLight: string
	themeDark: string
	name: string
}

interface HeaderProps {
	translations: HeaderTranslations
	locale: string
}

export default function Header({ translations, locale }: HeaderProps) {
	const displayNav = useSignal<boolean>(false)
	const displayLangMenu = useSignal<boolean>(false)
	const displayMobileLangMenu = useSignal<boolean>(false)
	const theme = useSignal<'light' | 'dark'>('dark')
	const isScrolled = useSignal<boolean>(false)
	const menuHeight = useSignal<number>(0)
	const menuRef = useRef<HTMLDivElement>(null)

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

		const handleScroll = () => {
			isScrolled.value = window.scrollY > 0
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	useEffect(() => {
		const updateMenuHeight = () => {
			if (menuRef.current) {
				menuHeight.value = menuRef.current.offsetHeight
			}
		}

		if (displayNav.value) {
			requestAnimationFrame(updateMenuHeight)
			window.addEventListener('resize', updateMenuHeight)
		} else {
			menuHeight.value = 0
		}

		return () => {
			window.removeEventListener('resize', updateMenuHeight)
		}
	}, [displayNav.value, displayMobileLangMenu.value])


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

	const handleNavLinkClick = () => {
		displayNav.value = false
	}

	const navLinks = [
		{ id: 'work', label: translations.work },
		{ id: 'experience', label: translations.experience },
		{
			href: 'mailto:thomas.jensen_@outlook.com',
			label: translations.contact,
		},
	]

	const availableLocales = [
		{ code: 'en', label: 'English', flag: '🇬🇧' },
		{ code: 'no', label: 'Norsk', flag: '🇳🇴' },
		{ code: 'he', label: 'עברית', flag: '🇮🇱' },
	]

	const currentLocale = availableLocales.find((l) => l.code === locale) ||
		availableLocales[0]

	const showGlass = isScrolled.value || displayNav.value
	const glassClass = 'bg-background/80 backdrop-blur-xl'
	const borderClass = showGlass && !displayNav.value
		? 'border-b border-border/20'
		: 'border-b border-transparent'

	return (
		<div className='sticky top-0 left-0 right-0 z-50'>
			<div
				className={`pointer-events-none absolute left-0 right-0 top-0 z-0 transition-colors duration-200 ${
					showGlass ? glassClass : 'bg-transparent'
				} ${borderClass}`}
				style={{
					height: `calc(4rem + ${displayNav.value ? menuHeight.value : 0}px)`,
				}}
			/>
			<header
				className={`relative z-50 h-16 transition-colors duration-200 md:text-foreground ${
					showGlass ? 'text-foreground' : 'text-black'
				}`}
			>
				<div className='container mx-auto flex h-full max-w-6xl items-center justify-between px-4'>
					<div className='flex items-center z-10'>
						<NavItem
							id='hero'
							label={translations.name}
							className='font-medium tracking-tight text-lg'
						/>
					</div>
					<div className='md:hidden'>
						<Button
							variant='ghost'
							size='sm'
							type='button'
							onClick={() => displayNav.value = !displayNav.value}
							className='focus:ring-0'
							aria-label={displayNav.value
								? translations.closeMenu
								: translations.openMenu}
						>
							{!displayNav.value
								? <HamburgerIcon />
								: <CloseIcon />}
						</Button>
					</div>
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
						<div className='relative ml-2'>
							<button
								type='button'
								onClick={() =>
									displayLangMenu.value = !displayLangMenu
										.value}
								onBlur={() =>
									setTimeout(
										() => displayLangMenu.value = false,
										150,
									)}
								className='flex items-center gap-1.5 px-2 py-1 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
							>
								<span>{currentLocale.flag}</span>
								<span>{currentLocale.label}</span>
								<svg
									className={`w-3 h-3 transition-transform ${
										displayLangMenu.value
											? 'rotate-180'
											: ''
									}`}
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 9l-7 7-7-7'
									/>
								</svg>
							</button>
							{displayLangMenu.value && (
								<div className='absolute top-full right-0 mt-1 py-1 bg-background border border-border/20 rounded-md shadow-lg min-w-[120px]'>
									{availableLocales.map((loc) => (
										<a
											key={loc.code}
											href={`/${loc.code}`}
											className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
												locale === loc.code
													? 'bg-primary/10 text-foreground font-medium'
													: 'text-muted-foreground hover:text-foreground hover:bg-muted'
											}`}
										>
											<span>{loc.flag}</span>
											<span>{loc.label}</span>
										</a>
									))}
								</div>
							)}
						</div>
						<ThemeToggle
							onClick={toggleTheme}
							theme={theme.value}
							showText={false}
							className='ml-2 h-9 rounded-full w-auto'
							lightText={translations.themeLight}
							darkText={translations.themeDark}
						/>
					</nav>
				</div>
			</header>
			{displayNav.value && (
				<div
					ref={menuRef}
					className='absolute top-16 -mt-px left-0 right-0 z-40 p-4 md:hidden'
				>
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
						<div className='border-t border-border/20 pt-4 flex flex-col items-center'>
							<button
								type='button'
								onClick={() =>
									displayMobileLangMenu.value =
										!displayMobileLangMenu.value}
								className='flex items-center gap-2 w-36 justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
							>
								<span>{currentLocale.flag}</span>
								<span>{currentLocale.label}</span>
								<svg
									className={`w-3 h-3 transition-transform ${
										displayMobileLangMenu.value
											? 'rotate-180'
											: ''
									}`}
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 9l-7 7-7-7'
									/>
								</svg>
							</button>
							{displayMobileLangMenu.value && (
								<div className='flex flex-col items-center gap-1 mt-2'>
									{availableLocales.filter((loc) =>
										loc.code !== locale
									).map((loc) => (
										<a
											key={loc.code}
											href={`/${loc.code}`}
											className='flex items-center gap-2 w-36 justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
										>
											<span>{loc.flag}</span>
											<span>{loc.label}</span>
										</a>
									))}
								</div>
							)}
						</div>
						<div className='border-t border-border/20 pt-4 flex items-center justify-center'>
							<ThemeToggle
								onClick={toggleTheme}
								theme={theme.value}
								showText
								className='h-10 rounded-full w-auto'
								lightText={translations.themeLight}
								darkText={translations.themeDark}
							/>
						</div>
					</nav>
				</div>
			)}
		</div>
	)
}
