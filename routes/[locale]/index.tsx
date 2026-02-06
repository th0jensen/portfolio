import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import Hero from '~/components/hero/page.tsx'
import Work from '~/components/work/page.tsx'
import Experience from '~/components/experience/page.tsx'
import {
	type About,
	AboutSchema,
	type Project,
	ProjectSchema,
} from '~/lib/schemas.ts'
import { getTranslationData } from '~/lib/db/locales.ts'
import {
	FALLBACK_REPOS,
	fetchGitHubPR,
	fetchGitHubTotalDownloads,
	fetchMultipleRepos,
	fetchZedExtensionWithGitHub,
} from '~/lib/github.ts'
import type { FormattedRepo } from '~/lib/schemas.ts'
import { z } from 'zod'

// Configure your GitHub repos here (owner/repo format)
const GITHUB_USERNAME = 'th0jensen'

// Featured PR (shown as large card)
const FEATURED_PR = { owner: 'zed-industries', repo: 'zed', number: 26211 }

// Zed extension
const ZED_EXTENSION_ID = 'gruber-darker'

// Your personal repos
const FEATURED_REPOS = [
	{ owner: GITHUB_USERNAME, repo: 'portfolio' },
	{ owner: GITHUB_USERNAME, repo: 'tunafiles' },
	{ owner: GITHUB_USERNAME, repo: 'nix' },
]

// Cache the repos to avoid hitting rate limits
let cachedRepos: FormattedRepo[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 15 // 15 minutes

async function getRepos(): Promise<FormattedRepo[]> {
	const now = Date.now()

	if (cachedRepos && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRepos
	}

	try {
		// Fetch the featured PR, Zed extension card, Zed app downloads, and repos in parallel
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

		// Combine PR (first/featured), Zed extension, and repos
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
		}
		return allItems.length > 0 ? allItems : FALLBACK_REPOS
	} catch (error) {
		console.error('Failed to fetch GitHub data:', error)
		return cachedRepos || FALLBACK_REPOS
	}
}

// Default fallback values
const DEFAULT_ABOUT: About = {
	firstName: 'Thomas',
	lastName: 'Jensen',
	birthday: '10-12-2003',
	humanLanguages: ['English', 'Norwegian', 'German', 'Hebrew'],
	computerLanguages: ['Typescript', 'Go', 'Swift', 'Rust'],
}

export const handler = define.handlers({
	async GET(ctx) {
		const { locale, translationData } = await getTranslationData(
			ctx.params.locale,
		)
		if (locale !== ctx.params.locale) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/${locale}` },
			})
		}
		ctx.state.locale = locale
		ctx.state.translationData = translationData as unknown as Record<
			string,
			Record<string, string>
		>
		return { data: null }
	},
})

export default define.page(async function Home(props) {
	const t = createTranslator(props.state.translationData || {})
	const repos = await getRepos()

	// Get data directly from translation data
	const translationData = props.state.translationData || {}
	const common =
		(translationData as Record<string, unknown>).common as Record<
			string,
			unknown
		> || {}

	// Validate and parse about data with Zod
	const aboutResult = AboutSchema.safeParse(common.about)
	const about: About = aboutResult.success ? aboutResult.data : DEFAULT_ABOUT

	// Validate and parse projects data with Zod
	const projectsResult = z.array(ProjectSchema).safeParse(common.projects)
	const projects: Project[] = projectsResult.success
		? projectsResult.data
		: []

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Hero about={about} t={t} />
			<Work projects={projects} t={t} />
			<Experience repos={repos} t={t} />
		</div>
	)
})
