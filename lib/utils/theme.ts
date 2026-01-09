export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

export function getInitialTheme(): Theme {
	if (typeof globalThis === 'undefined') return 'light'

	const stored = globalThis.localStorage.getItem(STORAGE_KEY) as Theme | null
	if (stored === 'light' || stored === 'dark') return stored

	return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
	if (typeof document === 'undefined') return

	if (theme === 'dark') {
		document.documentElement.classList.add('dark')
	} else {
		document.documentElement.classList.remove('dark')
	}

	globalThis.localStorage.setItem(STORAGE_KEY, theme)
}
