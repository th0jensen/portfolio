import type { FormattedRepo } from './schemas.ts'

export interface GitHubRepo {
	name: string
	full_name: string
	description: string | null
	html_url: string
	stargazers_count: number
	forks_count: number
	language: string | null
	owner: {
		login: string
	}
}

export interface GitHubPR {
	number: number
	title: string
	html_url: string
	state: string
	merged_at: string | null
	user: {
		login: string
	}
	base: {
		repo: {
			full_name: string
			language: string | null
		}
	}
	additions: number
	deletions: number
	changed_files: number
}

// Fallback repos in case GitHub API fails or rate limits
export const FALLBACK_REPOS: FormattedRepo[] = [
	{
		name: 'zed-industries/zed',
		description: 'workspace: Implement Extended Terminal Option',
		url: 'https://github.com/zed-industries/zed/pull/26211',
		stars: 0,
		forks: 0,
		language: 'Rust',
		languageColor: '#dea584',
		type: 'pr',
		prNumber: 26211,
		prState: 'merged',
		additions: 1082,
		deletions: 95,
	},
	{
		name: 'th0jensen/gruber-darker.zed',
		description: 'A port of Gruber Darker from emacs to Zed.',
		url: 'https://github.com/th0jensen/gruber-darker.zed',
		stars: 4,
		forks: 0,
		language: undefined,
		languageColor: undefined,
	},
	{
		name: 'th0jensen/portfolio',
		description:
			'Portfolio made in Fresh/Preact with Deno. Deployed on Deno Deploy.',
		url: 'https://github.com/th0jensen/portfolio',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: '#3178c6',
	},
	{
		name: 'th0jensen/tunafiles',
		description: 'A tuner files management platform.',
		url: 'https://github.com/th0jensen/tunafiles',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: '#3178c6',
	},
	{
		name: 'th0jensen/water-tracker',
		description: 'Water Tracker app made using React Native/Expo.',
		url: 'https://github.com/th0jensen/water-tracker',
		stars: 0,
		forks: 0,
		language: 'TypeScript',
		languageColor: '#3178c6',
	},
	{
		name: 'th0jensen/nix',
		description: 'Personal Nix configuration and system setup.',
		url: 'https://github.com/th0jensen/nix',
		stars: 0,
		forks: 0,
		language: 'Nix',
		languageColor: '#7e7eff',
	},
]

const LANGUAGE_COLORS: Record<string, string> = {
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	Rust: '#dea584',
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
}

export async function fetchGitHubPR(
	owner: string,
	repo: string,
	prNumber: number,
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
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
			{ headers },
		)

		if (!response.ok) {
			console.error(
				`Failed to fetch PR ${owner}/${repo}#${prNumber}: ${response.status}`,
			)
			return null
		}

		const pr: GitHubPR = await response.json()
		const language = pr.base.repo.language

		return {
			name: pr.base.repo.full_name,
			description: pr.title,
			url: pr.html_url,
			stars: 0,
			forks: 0,
			language: language || undefined,
			languageColor: language ? LANGUAGE_COLORS[language] : undefined,
			type: 'pr',
			prNumber: pr.number,
			prState: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
			additions: pr.additions,
			deletions: pr.deletions,
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

export async function fetchUserRepos(
	username: string,
	options: {
		sort?: 'stars' | 'updated' | 'pushed'
		perPage?: number
	} = {},
): Promise<FormattedRepo[]> {
	const { sort = 'stars', perPage = 6 } = options

	try {
		const response = await fetch(
			`https://api.github.com/users/${username}/repos?sort=${sort}&per_page=${perPage}&type=owner`,
			{
				headers: getHeaders(),
			},
		)

		if (!response.ok) {
			console.error(
				`Failed to fetch repos for ${username}: ${response.status}`,
			)
			return []
		}

		const repos: GitHubRepo[] = await response.json()

		return repos
			.sort((a, b) => b.stargazers_count - a.stargazers_count)
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
	} catch (error) {
		console.error(`Error fetching repos for ${username}:`, error)
		return []
	}
}
