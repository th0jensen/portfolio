import NavItem from '~/components/header/NavItem.tsx'
import ThemeToggle from '~/islands/ThemeToggle.tsx'
import HeaderMobileMenu from '~/islands/HeaderMobileMenu.tsx'

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
	currentPath?: string
}

const AVAILABLE_LOCALES = [
	{ code: 'en', label: 'English', flag: '🇬🇧' },
	{ code: 'no', label: 'Norsk', flag: '🇳🇴' },
	{ code: 'he', label: 'עברית', flag: '🇮🇱' },
]

export default function Header({
	translations,
	locale,
	currentPath = '/',
}: HeaderProps) {
	const localeRoot = `/${locale}`
	const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1
		? currentPath.slice(0, -1)
		: currentPath
	const pathWithoutLocale = normalizedPath === localeRoot
		? ''
		: normalizedPath.startsWith(`${localeRoot}/`)
		? normalizedPath.slice(localeRoot.length)
		: ''

	const navLinks = [
		{ href: `${localeRoot}/projects`, label: translations.work },
		{ href: `${localeRoot}/experience`, label: translations.experience },
		{ href: `${localeRoot}/contact`, label: translations.contact },
	]

	const buildLocaleHref = (code: string) => `/${code}${pathWithoutLocale}`
	const localesWithHref = AVAILABLE_LOCALES.map((loc) => ({
		...loc,
		href: buildLocaleHref(loc.code),
	}))
	const currentLocale = localesWithHref.find((l) => l.code === locale) ||
		localesWithHref[0]
	const nameHref = localeRoot

	return (
		<div className='sticky top-0 left-0 right-0 z-50'>
			<div className='pointer-events-none absolute left-0 right-0 top-0 z-0 bg-background/80 backdrop-blur-xl border-b border-border/20 h-16' />
			<header className='relative z-50 h-16 text-foreground'>
				<div className='container mx-auto flex h-full max-w-6xl items-center justify-between px-4'>
					<div className='flex items-center z-10'>
						<NavItem
							href={nameHref}
							label={translations.name}
							className='font-medium tracking-tight text-lg'
						/>
					</div>
					<HeaderMobileMenu
						navLinks={navLinks}
						locales={localesWithHref}
						currentLocale={currentLocale}
						openMenuLabel={translations.openMenu}
						closeMenuLabel={translations.closeMenu}
						themeLight={translations.themeLight}
						themeDark={translations.themeDark}
					/>
					<nav className='hidden md:flex md:items-center md:space-x-1'>
						{navLinks.map((link) => (
							<NavItem
								key={link.href}
								href={link.href}
								label={link.label}
								className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'
							/>
						))}
						<details className='relative ml-2 group'>
							<summary className='flex items-center gap-1.5 px-2 py-1 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted list-none cursor-pointer'>
								<span>{currentLocale.flag}</span>
								<span>{currentLocale.label}</span>
								<svg
									className='w-3 h-3 transition-transform group-open:rotate-180'
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
							</summary>
							<div className='absolute top-full right-0 mt-1 py-1 bg-background border border-border/20 rounded-md shadow-lg min-w-[120px]'>
								{localesWithHref.map((loc) => (
									<a
										key={loc.code}
										href={loc.href}
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
						</details>
						<ThemeToggle
							className='ml-2 h-9 rounded-full w-auto'
							showText={false}
							lightText={translations.themeLight}
							darkText={translations.themeDark}
						/>
					</nav>
				</div>
			</header>
		</div>
	)
}
