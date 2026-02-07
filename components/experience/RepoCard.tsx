import type { FormattedRepo } from '~/lib/schemas.ts'
import type { RepoUiLabels } from './repoLabels.ts'
import RepoCardHeader from '~/components/experience/RepoCardHeader.tsx'
import RepoCardStats from '~/components/experience/RepoCardStats.tsx'

interface RepoCardProps {
	repo: FormattedRepo
	size?: 'large' | 'wide' | 'default'
	labels: RepoUiLabels
}

export default function RepoCard({
	repo,
	size = 'default',
	labels,
}: RepoCardProps) {
	const sizeClasses = {
		large: 'md:col-span-2 md:row-span-2',
		wide: 'md:col-span-2',
		default: '',
	}

	const isLarge = size === 'large'

	return (
		<div
			className={`group glass-card overflow-hidden rounded-2xl p-6 smooth-transition hover:shadow-lg hover:border-border/60 flex flex-col relative ${
				sizeClasses[size]
			}`}
		>
			<RepoCardHeader repo={repo} labels={labels} isLarge={isLarge} />

			<p
				className={`text-muted-foreground leading-relaxed flex-grow relative z-10 whitespace-pre-line ${
					isLarge ? 'text-base mb-6' : 'text-sm mb-4'
				}`}
			>
				{repo.description}
			</p>

			<RepoCardStats repo={repo} labels={labels} />
		</div>
	)
}
