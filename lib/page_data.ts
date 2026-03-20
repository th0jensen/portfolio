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
import {
	getGitHubRepoCache,
	upsertGitHubRepoCache,
} from '~/lib/db/github_cache.ts'
import type { ExtendedState } from '~/utils.ts'

// Configure your GitHub repos here (owner/repo format)
const GITHUB_USERNAME = 'th0jensen'

// Featured PRs (first item is shown as the large card)
const FEATURED_PRS = [
	{ owner: 'zed-industries', repo: 'zed', number: 50653 },
	{ owner: 'zed-industries', repo: 'zed', number: 26211 },
]

// Zed extension
const ZED_EXTENSION_ID = 'gruber-darker'

// Personal repos
const FEATURED_REPOS = [
	{ owner: GITHUB_USERNAME, repo: 'crabdash' },
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

interface LivePortfolioRepoOptions {
	persist?: boolean
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

async function loadLivePortfolioRepos(): Promise<FormattedRepo[]> {
	const [featuredPRs, zedExtension, zedTotalDownloads, repos] = await Promise
		.all([
			Promise.all(
				FEATURED_PRS.map((pr) =>
					fetchGitHubPR(pr.owner, pr.repo, pr.number)
				),
			),
			fetchZedExtensionWithGitHub(
				ZED_EXTENSION_ID,
				GITHUB_USERNAME,
				'gruber-darker.zed',
			),
			fetchGitHubTotalDownloads(
				FEATURED_PRS[0].owner,
				FEATURED_PRS[0].repo,
			),
			fetchMultipleRepos(FEATURED_REPOS),
		])

	const featuredPrsWithProductStats = featuredPRs
		.filter((repo): repo is FormattedRepo => repo !== null)
		.map((featuredPR) => ({
			...featuredPR,
			downloads: zedTotalDownloads ?? featuredPR.downloads,
		}))

	const usedRepoFallback = repos === FALLBACK_REPOS
	const allItems: FormattedRepo[] = []
	if (featuredPrsWithProductStats.length > 0) {
		allItems.push(...featuredPrsWithProductStats)
	}
	if (zedExtension) {
		allItems.push(zedExtension)
	}
	allItems.push(...repos)

	if (
		allItems.length > 0 &&
		(!usedRepoFallback || allItems.length > repos.length)
	) {
		return allItems
	}

	throw new Error('GitHub API returned only fallback repo data.')
}

export async function getPortfolioRepos(): Promise<FormattedRepo[]> {
	try {
		const cached = await getGitHubRepoCache()
		return cached || FALLBACK_REPOS
	} catch (error) {
		console.error('Failed to read cached GitHub repo data:', error)
		return FALLBACK_REPOS
	}
}

export async function getLivePortfolioRepos(
	{ persist = true }: LivePortfolioRepoOptions = {},
): Promise<FormattedRepo[]> {
	const now = Date.now()

	if (cachedRepos && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRepos
	}

	try {
		const repos = await loadLivePortfolioRepos()
		cachedRepos = repos
		cacheTimestamp = now

		if (persist) {
			try {
				await upsertGitHubRepoCache({ repos })
			} catch (error) {
				console.error('Failed to persist live GitHub repo data:', error)
			}
		}

		return repos
	} catch (error) {
		console.error('Failed to fetch live GitHub data:', error)
		return cachedRepos || await getPortfolioRepos()
	}
}
