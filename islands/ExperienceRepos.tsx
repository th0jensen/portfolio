import { useEffect, useState } from 'preact/hooks'
import RepoCard from '~/components/experience/RepoCard.tsx'
import { getRepoUiLabels } from '~/components/experience/repoLabels.ts'
import { getBentoSize } from '~/components/experience/utils.ts'
import type { FormattedRepo } from '~/lib/schemas.ts'

interface ExperienceReposProps {
	initialRepos: FormattedRepo[]
	locale: string
}

export default function ExperienceRepos(
	{ initialRepos, locale }: ExperienceReposProps,
) {
	const [repos, setRepos] = useState(initialRepos)
	const labels = getRepoUiLabels(locale)

	useEffect(() => {
		const abortController = new AbortController()

		void fetch('/api/github/repos', {
			headers: {
				Accept: 'application/json',
			},
			signal: abortController.signal,
		})
			.then((response) => response.ok ? response.json() : null)
			.then((nextRepos) => {
				if (!Array.isArray(nextRepos) || nextRepos.length === 0) {
					return
				}
				setRepos(nextRepos as FormattedRepo[])
			})
			.catch((error) => {
				if (
					error instanceof DOMException && error.name === 'AbortError'
				) {
					return
				}
				console.error('Failed to refresh GitHub repo data:', error)
			})

		return () => abortController.abort()
	}, [])

	if (repos.length === 0) {
		return (
			<div className='text-center py-12 text-muted-foreground'>
				<p>{labels.loadingRepos}</p>
			</div>
		)
	}

	return (
		<div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 md:auto-rows-[minmax(200px,auto)]'>
			{repos.map((repo, index) => (
				<RepoCard
					key={repo.url}
					repo={repo}
					size={getBentoSize(index)}
					labels={labels}
				/>
			))}
		</div>
	)
}
