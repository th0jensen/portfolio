import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db.ts'
import { githubRepoCache } from './schema.ts'
import { type FormattedRepo, FormattedRepoSchema } from '../schemas.ts'

export const PORTFOLIO_REPO_CACHE_KEY = 'portfolio-experience-repos'

const formattedRepoListSchema = z.array(FormattedRepoSchema)

interface UpsertGitHubRepoCacheInput {
	cacheKey?: string
	repos: FormattedRepo[]
}

export async function upsertGitHubRepoCache({
	cacheKey = PORTFOLIO_REPO_CACHE_KEY,
	repos,
}: UpsertGitHubRepoCacheInput): Promise<void> {
	const parsedRepos = formattedRepoListSchema.parse(repos)

	await db
		.insert(githubRepoCache)
		.values({
			cacheKey,
			repos: parsedRepos,
		})
		.onConflictDoUpdate({
			target: [githubRepoCache.cacheKey],
			set: {
				repos: parsedRepos,
				updatedAt: new Date().toISOString(),
			},
		})
}

export async function getGitHubRepoCache(
	cacheKey = PORTFOLIO_REPO_CACHE_KEY,
): Promise<FormattedRepo[] | null> {
	const rows = await db
		.select({
			repos: githubRepoCache.repos,
		})
		.from(githubRepoCache)
		.where(eq(githubRepoCache.cacheKey, cacheKey))
		.limit(1)

	if (rows.length === 0) {
		return null
	}

	return formattedRepoListSchema.parse(rows[0].repos)
}
