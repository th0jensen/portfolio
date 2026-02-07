import { z } from 'zod'
import type { FormattedRepo } from './schemas.ts'

export type { FormattedRepo }

// GitHub API Schemas
export const GitHubRepoSchema = z.object({
	name: z.string(),
	full_name: z.string(),
	description: z.string().nullable(),
	html_url: z.string().url(),
	stargazers_count: z.number().int().nonnegative(),
	forks_count: z.number().int().nonnegative(),
	language: z.string().nullable(),
	owner: z.object({
		login: z.string(),
	}),
})

export const GitHubPRSchema = z.object({
	number: z.number().int().positive(),
	title: z.string(),
	body: z.string().nullable(),
	html_url: z.string().url(),
	state: z.string(),
	merged_at: z.string().nullable(),
	user: z.object({
		login: z.string(),
	}),
	base: z.object({
		repo: z.object({
			full_name: z.string(),
			language: z.string().nullable(),
		}),
	}),
	additions: z.number().int().nonnegative(),
	deletions: z.number().int().nonnegative(),
	changed_files: z.number().int().nonnegative(),
})

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>
export type GitHubPR = z.infer<typeof GitHubPRSchema>
type GitHubRelease = {
	assets?: Array<{ download_count?: number }>
}

// Language colors - centralized and used throughout
export const LANGUAGE_COLORS: Record<string, string> = {
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	Rust: '#c25a3c',
	Swift: '#f05138',
	Python: '#3572A5',
	Go: '#00ADD8',
	Shell: '#89e051',
	HTML: '#e34c26',
	CSS: '#563d7c',
	SCSS: '#c6538c',
	Vue: '#41b883',
	Svelte: '#ff3e00',
	Kotlin: '#A97BFF',
	Java: '#b07219',
	C: '#555555',
	'C++': '#f34b7d',
	'C#': '#178600',
	PHP: '#4F5D95',
	Ruby: '#701516',
	Dart: '#00B4AB',
	Lua: '#000080',
	Zig: '#ec915c',
	Nix: '#7e7eff',
	JSON: '#f1e05a',
} as const

export function getLanguageColor(
	language: string | null | undefined,
): string | undefined {
	if (!language) return undefined
	return LANGUAGE_COLORS[language]
}

// Fallback repos in case GitHub API fails or rate limits
export const FALLBACK_REPOS: FormattedRepo[] = [
	{
		name: 'owner/repo',
		description: 'Pull request title\n\nRelease notes content here',
		url: 'https://github.com/owner/repo/pull/0',
		stars: 0,
		forks: 0,
		language: 'Rust',
		languageColor: LANGUAGE_COLORS['Rust'],
		type: 'pr',
		prNumber: 0,
		prState: 'merged',
		additions: 0,
		deletions: 0,
	},
	{
		name: 'th0jensen/gruber-darker.zed',
		description: 'A port of Gruber Darker from emacs to Zed.',
		url: 'https://github.com/th0jensen/gruber-darker.zed',
		stars: 0,
		forks: 0,
		language: 'JSON',
		languageColor: LANGUAGE_COLORS['JSON'],
		type: 'zed-extension',
		downloads: 0,
		zedExtensionUrl: 'zed://extension/gruber-darker',
		githubUrl: 'https://github.com/th0jensen/gruber-darker.zed',
	},
	{
		name: 'th0jensen/portfolio',
		description:
			'Portfolio made in Fresh/Preact with Deno. Deployed on Deno Deploy.',
		url: 'https://github.com/th0jensen/portfolio',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: LANGUAGE_COLORS['TypeScript'],
	},
	{
		name: 'th0jensen/tunafiles',
		description: 'A tuner files management platform.',
		url: 'https://github.com/th0jensen/tunafiles',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: LANGUAGE_COLORS['TypeScript'],
	},
	{
		name: 'th0jensen/water-tracker',
		description: 'Water Tracker app made using React Native/Expo.',
		url: 'https://github.com/th0jensen/water-tracker',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: LANGUAGE_COLORS['TypeScript'],
	},
	{
		name: 'th0jensen/nix',
		description: 'Personal Nix configuration and system setup.',
		url: 'https://github.com/th0jensen/nix',
		stars: 0,
		forks: 0,
		language: 'Nix',
		languageColor: LANGUAGE_COLORS['Nix'],
	},
]

export async function fetchZedExtensionWithGitHub(
	extensionId: string,
	owner: string,
	repo: string,
): Promise<FormattedRepo | null> {
	try {
		// Fetch both GitHub repo and Zed extension data in parallel
		const [githubData, zedData] = await Promise.all([
			fetchGitHubRepo(owner, repo),
			fetch(`https://api.zed.dev/extensions/${extensionId}`, {
				headers: { 'User-Agent': 'Portfolio-Site' },
			}).then((res) => res.ok ? res.json() : null),
		])

		if (!githubData) {
			console.error(`Failed to fetch GitHub data for ${owner}/${repo}`)
			return null
		}

		let downloads = 0
		if (zedData?.data && zedData.data.length > 0) {
			downloads = zedData.data[0].download_count
		}

		// For Zed extensions, default to JSON if GitHub doesn't provide a language
		const language = githubData.language || 'JSON'

		return {
			name: githubData.full_name,
			description: githubData.description || 'No description available',
			url: githubData.html_url,
			stars: githubData.stargazers_count,
			forks: githubData.forks_count,
			language,
			languageColor: getLanguageColor(language),
			type: 'zed-extension',
			downloads,
			zedExtensionUrl: `zed://extension/${extensionId}`,
			githubUrl: githubData.html_url,
		}
	} catch (error) {
		console.error(
			`Error fetching Zed extension with GitHub data ${extensionId}:`,
			error,
		)
		return null
	}
}

export async function fetchGitHubPR(
	owner: string,
	repo: string,
	prNumber: number,
	options: { downloads?: number } = {},
): Promise<FormattedRepo | null> {
	const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')

	const headers: HeadersInit = {
		Accept: 'application/vnd.github.v3+json',
		'User-Agent': 'Portfolio-Site',
	}

	if (GITHUB_TOKEN) {
		headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
	}

	try {
		const [prResponse, repoResponse] = await Promise.all([
			fetch(
				`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
				{ headers },
			),
			fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
		])

		if (!prResponse.ok) {
			console.error(
				`Failed to fetch PR ${owner}/${repo}#${prNumber}: ${prResponse.status}`,
			)
			return null
		}

		const pr: GitHubPR = await prResponse.json()
		const repoData: GitHubRepo | null = repoResponse.ok
			? await repoResponse.json()
			: null
		const language = repoData?.language ?? pr.base.repo.language

		// Extract content from PR body and clean it up
		let description = pr.title
		if (pr.body && pr.body.trim()) {
			// Extract everything from Closes lines through Release Notes
			const cleanBody = pr.body
				.replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
				.replace(/Screenshot.*?:/gi, '') // Remove "Screenshot of..." lines
				.replace(/\n\s*\n+/g, '\n\n') // Normalize line breaks
				.trim()

			// Look for pattern: starts with Closes or Release Notes
			const contentMatch = cleanBody.match(
				/(Closes[\s\S]*?Release Notes:[\s\S]*)/i,
			)

			if (contentMatch) {
				description = `${pr.title}\n\n${contentMatch[1].trim()}`
			}
		}

		return {
			name: pr.base.repo.full_name,
			description,
			url: pr.html_url,
			stars: repoData?.stargazers_count ?? 0,
			forks: repoData?.forks_count ?? 0,
			language: language || undefined,
			languageColor: getLanguageColor(language),
			type: 'pr',
			prNumber: pr.number,
			prState: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
			additions: pr.additions,
			deletions: pr.deletions,
			downloads: options.downloads,
		}
	} catch (error) {
		console.error(`Error fetching PR ${owner}/${repo}#${prNumber}:`, error)
		return null
	}
}

// Get GitHub token from environment for higher rate limits
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')

function getHeaders(): HeadersInit {
	const headers: HeadersInit = {
		Accept: 'application/vnd.github.v3+json',
		'User-Agent': 'Portfolio-Site',
	}

	if (GITHUB_TOKEN) {
		headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
	}

	return headers
}

function parseLastPage(linkHeader: string | null): number {
	if (!linkHeader) return 1

	const lastPageMatch = linkHeader.match(
		/<[^>]*[?&]page=(\d+)[^>]*>\s*;\s*rel="last"/,
	)

	if (!lastPageMatch) {
		return 1
	}

	const page = Number(lastPageMatch[1])
	return Number.isFinite(page) && page > 0 ? page : 1
}

function sumReleaseDownloads(releases: GitHubRelease[]): number {
	let total = 0
	for (const release of releases) {
		if (!release.assets) continue
		for (const asset of release.assets) {
			if (typeof asset.download_count === 'number') {
				total += asset.download_count
			}
		}
	}
	return total
}

export async function fetchGitHubTotalDownloads(
	owner: string,
	repo: string,
): Promise<number | undefined> {
	try {
		const perPage = 100
		const firstResponse = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=1`,
			{ headers: getHeaders() },
		)

		if (!firstResponse.ok) {
			console.error(
				`Failed to fetch release downloads for ${owner}/${repo}: ${firstResponse.status}`,
			)
			return undefined
		}

		const firstPageReleases: GitHubRelease[] = await firstResponse.json()
		let totalDownloads = sumReleaseDownloads(firstPageReleases)
		const lastPage = parseLastPage(firstResponse.headers.get('link'))

		if (lastPage <= 1) {
			return totalDownloads
		}

		const pageRequests: Promise<Response>[] = []
		for (let page = 2; page <= lastPage; page++) {
			pageRequests.push(
				fetch(
					`https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`,
					{ headers: getHeaders() },
				),
			)
		}

		const pageResponses = await Promise.all(pageRequests)
		for (const pageResponse of pageResponses) {
			if (!pageResponse.ok) {
				console.error(
					`Failed to fetch release downloads page for ${owner}/${repo}: ${pageResponse.status}`,
				)
				continue
			}
			const pageReleases: GitHubRelease[] = await pageResponse.json()
			totalDownloads += sumReleaseDownloads(pageReleases)
		}

		return totalDownloads
	} catch (error) {
		console.error(
			`Error fetching release downloads for ${owner}/${repo}:`,
			error,
		)
		return undefined
	}
}

export async function fetchGitHubRepo(
	owner: string,
	repo: string,
): Promise<GitHubRepo | null> {
	try {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${repo}`,
			{
				headers: getHeaders(),
			},
		)

		if (!response.ok) {
			console.error(
				`Failed to fetch ${owner}/${repo}: ${response.status}`,
			)
			return null
		}

		return await response.json()
	} catch (error) {
		console.error(`Error fetching ${owner}/${repo}:`, error)
		return null
	}
}

export async function fetchMultipleRepos(
	repos: Array<{ owner: string; repo: string }>,
): Promise<FormattedRepo[]> {
	const results = await Promise.all(
		repos.map(({ owner, repo }) => fetchGitHubRepo(owner, repo)),
	)

	const formattedRepos = results
		.filter((repo): repo is GitHubRepo => repo !== null)
		.map((repo) => ({
			name: repo.full_name,
			description: repo.description || 'No description available',
			url: repo.html_url,
			stars: repo.stargazers_count,
			forks: repo.forks_count,
			language: repo.language || undefined,
			languageColor: repo.language
				? LANGUAGE_COLORS[repo.language]
				: undefined,
		}))

	// Return fallback if no repos were fetched successfully
	if (formattedRepos.length === 0) {
		console.warn('GitHub API returned no repos, using fallback data')
		return FALLBACK_REPOS
	}

	return formattedRepos
}
