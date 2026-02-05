import { createTranslator } from 'fresh-i18n'
import Experience from './page.tsx'
import { getLocaleContent } from '~/lib/db/content.ts'
import {
	FALLBACK_REPOS,
	fetchGitHubPR,
	fetchMultipleRepos,
	fetchZedExtensionWithGitHub,
} from '~/lib/github.ts'
import type { FormattedRepo } from '~/lib/schemas.ts'

const GITHUB_USERNAME = 'th0jensen'
const FEATURED_PR = { owner: 'zed-industries', repo: 'zed', number: 26211 }
const ZED_EXTENSION_ID = 'gruber-darker'
const FEATURED_REPOS = [
	{ owner: GITHUB_USERNAME, repo: 'portfolio' },
	{ owner: GITHUB_USERNAME, repo: 'tunafiles' },
	{ owner: GITHUB_USERNAME, repo: 'nix' },
]

let cachedRepos: FormattedRepo[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 15

async function getRepos(): Promise<FormattedRepo[]> {
	const now = Date.now()

	if (cachedRepos && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRepos
	}

	try {
		const [featuredPR, zedExtension, repos] = await Promise.all([
			fetchGitHubPR(
				FEATURED_PR.owner,
				FEATURED_PR.repo,
				FEATURED_PR.number,
			),
			fetchZedExtensionWithGitHub(
				ZED_EXTENSION_ID,
				GITHUB_USERNAME,
				'gruber-darker.zed',
			),
			fetchMultipleRepos(FEATURED_REPOS),
		])

		const allItems: FormattedRepo[] = []
		if (featuredPR) {
			allItems.push(featuredPR)
		}
		if (zedExtension) {
			allItems.push(zedExtension)
		}
		allItems.push(...repos)

		if (allItems.length > 0) {
			cachedRepos = allItems
			cacheTimestamp = now
		}
		return allItems.length > 0 ? allItems : FALLBACK_REPOS
	} catch (error) {
		console.error('Failed to fetch GitHub data:', error)
		return cachedRepos || FALLBACK_REPOS
	}
}

interface ExperienceSectionProps {
	locale: string
}

export default async function ExperienceSection({ locale }: ExperienceSectionProps) {
	const [content, repos] = await Promise.all([
		getLocaleContent(locale),
		getRepos(),
	])
	const t = createTranslator({ common: content ?? {} })

	return <Experience repos={repos} t={t} />
}
