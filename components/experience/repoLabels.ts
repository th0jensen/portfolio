export type LocaleKey = 'en' | 'no' | 'he'

export interface RepoUiLabels {
	stars: string
	forks: string
	downloads: string
	additions: string
	deletions: string
	viewInZed: string
	loadingRepos: string
	visitRepo: (name: string) => string
	prState: Record<'open' | 'closed' | 'merged', string>
}

const REPO_UI_LABELS: Record<LocaleKey, RepoUiLabels> = {
	en: {
		stars: 'Stars',
		forks: 'Forks',
		downloads: 'Downloads',
		additions: 'Additions',
		deletions: 'Deletions',
		viewInZed: 'View in Zed',
		loadingRepos: 'Loading repositories...',
		visitRepo: (name: string) => `Visit ${name}`,
		prState: {
			open: 'Open',
			closed: 'Closed',
			merged: 'Merged',
		},
	},
	no: {
		stars: 'Stjerner',
		forks: 'Forker',
		downloads: 'Nedlastinger',
		additions: 'Linjer lagt til',
		deletions: 'Linjer fjernet',
		viewInZed: 'Åpne i Zed',
		loadingRepos: 'Laster inn repositorier...',
		visitRepo: (name: string) => `Besøk ${name}`,
		prState: {
			open: 'Åpen',
			closed: 'Lukket',
			merged: 'Slått sammen',
		},
	},
	he: {
		stars: 'כוכבים',
		forks: 'פיצולים',
		downloads: 'הורדות',
		additions: 'שורות שנוספו',
		deletions: 'שורות שנמחקו',
		viewInZed: 'פתח ב-Zed',
		loadingRepos: 'טוען מאגרים...',
		visitRepo: (name: string) => `בקר ב-${name}`,
		prState: {
			open: 'פתוח',
			closed: 'סגור',
			merged: 'מוזג',
		},
	},
}

export function getRepoUiLabels(locale: string): RepoUiLabels {
	if (locale === 'no' || locale === 'he') {
		return REPO_UI_LABELS[locale]
	}
	return REPO_UI_LABELS.en
}
