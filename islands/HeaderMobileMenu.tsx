import { useSignal } from '@preact/signals'
import NavItem from '~/components/header/NavItem.tsx'
import ThemeToggle from '~/islands/ThemeToggle.tsx'
import HamburgerIcon from '~/components/ui/icons/HamburgerIcon.tsx'
import CloseIcon from '~/components/ui/icons/CloseIcon.tsx'

interface NavLink {
	href: string
	label: string
}

interface LocaleOption {
	code: string
	label: string
	flag: string
	href: string
}

interface HeaderMobileMenuProps {
	navLinks: NavLink[]
	locales: LocaleOption[]
	currentLocale: LocaleOption
	openMenuLabel: string
	closeMenuLabel: string
	themeLight: string
	themeDark: string
}

export default function HeaderMobileMenu({
	navLinks,
	locales,
	currentLocale,
	openMenuLabel,
	closeMenuLabel,
	themeLight,
	themeDark,
}: HeaderMobileMenuProps) {
	const displayNav = useSignal(false)
	const displayLangMenu = useSignal(false)

	const toggleNav = () => {
		displayNav.value = !displayNav.value
		if (!displayNav.value) {
			displayLangMenu.value = false
		}
	}

	const handleNavLinkClick = () => {
		displayNav.value = false
		displayLangMenu.value = false
	}

	return (
		<div className='md:hidden'>
			<button
				className='inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors'
				type='button'
				onClick={toggleNav}
				aria-label={displayNav.value ? closeMenuLabel : openMenuLabel}
			>
				{displayNav.value ? <CloseIcon /> : <HamburgerIcon />}
			</button>
			{displayNav.value && (
				<div className='absolute top-16 -mt-px left-0 right-0 z-40 p-4'>
					<nav className='flex flex-col space-y-4 rounded-2xl bg-background/90 backdrop-blur-xl border border-border/20 p-4'>
						<div className='flex flex-col items-center gap-4'>
							{navLinks.map((link) => (
								<NavItem
									key={link.href}
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
									displayLangMenu.value = !displayLangMenu.value}
								className='flex items-center gap-2 w-36 justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
							>
								<span>{currentLocale.flag}</span>
								<span>{currentLocale.label}</span>
								<svg
									className={`w-3 h-3 transition-transform ${
										displayLangMenu.value ? 'rotate-180' : ''
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
								<div className='flex flex-col items-center gap-1 mt-2'>
									{locales
										.filter((loc) => loc.code !== currentLocale.code)
										.map((loc) => (
											<a
												key={loc.code}
												href={loc.href}
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
								showText
								className='h-10 rounded-full w-auto'
								lightText={themeLight}
								darkText={themeDark}
							/>
						</div>
					</nav>
				</div>
			)}
		</div>
	)
}
