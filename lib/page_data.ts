import { z } from 'zod'
import {
	type About,
	AboutSchema,
	type FormattedRepo,
	type Project,
	ProjectSchema,
} from '~/lib/schemas.ts'
import {
	FALLBACK_REPOS,
	fetchGitHubPR,
	fetchGitHubTotalDownloads,
	fetchMultipleRepos,
	fetchZedExtensionWithGitHub,
} from '~/lib/github.ts'
import type { ExtendedState } from '~/utils.ts'

// Configure your GitHub repos here (owner/repo format)
const GITHUB_USERNAME = 'th0jensen'

// Featured PR (shown as large card)
const FEATURED_PR = { owner: 'zed-industries', repo: 'zed', number: 26211 }

// Zed extension
const ZED_EXTENSION_ID = 'gruber-darker'

// Personal repos
const FEATURED_REPOS = [
	{ owner: GITHUB_USERNAME, repo: 'portfolio' },
	{ owner: GITHUB_USERNAME, repo: 'tunafiles' },
	{ owner: GITHUB_USERNAME, repo: 'nix' },
]

// Cache the repos to avoid rate-limit pressure and repeated fetches
let cachedRepos: FormattedRepo[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 15 // 15 minutes

const DEFAULT_ABOUT: About = {
	firstName: 'Thomas',
	lastName: 'Jensen',
	birthday: '10-12-2003',
	humanLanguages: ['English', 'Norwegian', 'German', 'Hebrew'],
	computerLanguages: ['Typescript', 'Go', 'Swift', 'Rust'],
}

export interface PortfolioPageData {
	locale: string
	about: About
	projects: Project[]
}

export function getPortfolioPageDataFromState(
	state: ExtendedState,
): PortfolioPageData {
	const translationData = state.translationData || {}
	const common =
		(translationData as Record<string, unknown>).common as Record<
			string,
			unknown
		> || {}

	const aboutResult = AboutSchema.safeParse(common.about)
	const about: About = aboutResult.success ? aboutResult.data : DEFAULT_ABOUT

	const projectsResult = z.array(ProjectSchema).safeParse(common.projects)
	const projects: Project[] = projectsResult.success
		? projectsResult.data
		: []

	return {
		locale: state.locale || 'en',
		about,
		projects,
	}
}

export async function getPortfolioRepos(): Promise<FormattedRepo[]> {
	const now = Date.now()

	if (cachedRepos && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRepos
	}

	try {
		const [featuredPR, zedExtension, zedTotalDownloads, repos] =
			await Promise.all([
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
				fetchGitHubTotalDownloads(FEATURED_PR.owner, FEATURED_PR.repo),
				fetchMultipleRepos(FEATURED_REPOS),
			])

		const featuredPrWithProductStats = featuredPR
			? {
				...featuredPR,
				downloads: zedTotalDownloads ?? featuredPR.downloads,
			}
			: null

		const allItems: FormattedRepo[] = []
		if (featuredPrWithProductStats) {
			allItems.push(featuredPrWithProductStats)
		}
		if (zedExtension) {
			allItems.push(zedExtension)
		}
		allItems.push(...repos)

		if (allItems.length > 0) {
			cachedRepos = allItems
			cacheTimestamp = now
			return allItems
		}

		return FALLBACK_REPOS
	} catch (error) {
		console.error('Failed to fetch GitHub data:', error)
		return cachedRepos || FALLBACK_REPOS
	}
}
