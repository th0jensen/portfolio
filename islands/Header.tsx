import { useEffect, useState } from 'preact/hooks'
import { Button, Link } from '~/components/ui/button.tsx'
import { Menu, Moon, Sun, X } from 'lucide-preact'

export default function Header() {
    const [displayNav, setDisplayNav] = useState<boolean>(false)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        // Check initial theme preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark')
            document.documentElement.classList.add('dark')
        }

        // Listen for theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
            'change',
            (event) => {
                const newTheme = event.matches ? 'dark' : 'light'
                setTheme(newTheme)
                if (event.matches) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            },
        )
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    return (
        <header className='fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/5 bg-background/80 backdrop-blur-md'>
            <div className='container mx-auto flex h-full max-w-6xl items-center justify-between px-4'>
                {/* Logo/Name */}
                <div className='flex items-center z-10'>
                    <Link
                        variant='ghost'
                        size='sm'
                        href={'#hero'}
                        className='font-medium tracking-tight text-lg'
                    >
                        Thomas Jensen
                    </Link>
                </div>

                {/* Mobile menu button */}
                <div className='md:hidden'>
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setDisplayNav(!displayNav)}
                        className='focus:ring-0'
                        aria-label={displayNav ? 'Close menu' : 'Open menu'}
                    >
                        {!displayNav ? <Menu className='h-5 w-5' /> : <X className='h-5 w-5' />}
                    </Button>
                </div>

                {/* Desktop Navigation */}
                <nav className='hidden md:flex md:items-center md:space-x-1'>
                    <Link variant='ghost' size='sm' href={'#work'} className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'>
                        Work
                    </Link>
                    <Link variant='ghost' size='sm' href={'#experience'} className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'>
                        Experience
                    </Link>
                    <Link variant='ghost' size='sm' href={'#projects'} className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'>
                        Projects
                    </Link>
                    <Link 
                        variant='ghost' 
                        size='sm' 
                        href={'mailto:thomas.jensen_@outlook.com'} 
                        className='px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80'
                    >
                        Contact
                    </Link>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={toggleTheme}
                        className='ml-2 h-9 w-9 rounded-full'
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? (
                            <Moon className='h-4 w-4' />
                        ) : (
                            <Sun className='h-4 w-4' />
                        )}
                    </Button>
                </nav>

                {/* Mobile Navigation Menu */}
                {displayNav && (
                    <div className='absolute inset-x-0 top-16 z-50 bg-background/95 p-4 backdrop-blur-md shadow-lg border-b border-border/10 md:hidden'>
                        <nav className='flex flex-col space-y-4'>
                            <Link 
                                variant='ghost' 
                                href={'#work'} 
                                className='w-full px-4 py-2 text-left text-sm font-medium'
                                onClick={() => setDisplayNav(false)}
                            >
                                Work
                            </Link>
                            <Link 
                                variant='ghost' 
                                href={'#experience'} 
                                className='w-full px-4 py-2 text-left text-sm font-medium'
                                onClick={() => setDisplayNav(false)}
                            >
                                Experience
                            </Link>
                            <Link 
                                variant='ghost' 
                                href={'#projects'} 
                                className='w-full px-4 py-2 text-left text-sm font-medium'
                                onClick={() => setDisplayNav(false)}
                            >
                                Projects
                            </Link>
                            <Link 
                                variant='ghost' 
                                href={'mailto:thomas.jensen_@outlook.com'} 
                                className='w-full px-4 py-2 text-left text-sm font-medium'
                                onClick={() => setDisplayNav(false)}
                            >
                                Contact
                            </Link>
                            <div className='border-t border-border/10 pt-4 flex justify-between items-center'>
                                <span className='text-sm text-muted-foreground'>Switch theme</span>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={toggleTheme}
                                    className='h-8 w-8 rounded-full'
                                >
                                    {theme === 'light' ? (
                                        <Moon className='h-4 w-4' />
                                    ) : (
                                        <Sun className='h-4 w-4' />
                                    )}
                                </Button>
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}
