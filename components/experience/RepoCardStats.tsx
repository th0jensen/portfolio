import type { ComponentChildren } from 'preact'
import type { FormattedRepo } from '~/lib/schemas.ts'
import type { RepoUiLabels } from './repoLabels.ts'
import { formatNumber } from './formatNumber.ts'

interface RepoCardStatsProps {
	repo: FormattedRepo
	labels: RepoUiLabels
}

function Stat({
	children,
	label,
}: {
	children: ComponentChildren
	label: string
}) {
	return (
		<div className='flex items-center gap-1 relative group/stat'>
			{children}
			<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
				{label}
			</span>
		</div>
	)
}

export default function RepoCardStats({ repo, labels }: RepoCardStatsProps) {
	const isPR = repo.type === 'pr'
	const isZedPR = isPR && repo.url.includes('/zed-industries/zed/')
	const isZedExtension = repo.type === 'zed-extension'

	const prStateColors = {
		merged: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
		closed: 'bg-red-500/15 text-red-600 dark:text-red-400',
		open: 'bg-green-500/15 text-green-600 dark:text-green-400',
	}

	const starsStat = (
		<Stat label={labels.stars}>
			<svg className='w-4 h-4' fill='currentColor' viewBox='0 0 16 16'>
				<path d='M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z' />
			</svg>
			<span>{formatNumber(repo.stars)}</span>
		</Stat>
	)

	const forksStat = (
		<Stat label={labels.forks}>
			<svg className='w-4 h-4' fill='currentColor' viewBox='0 0 16 16'>
				<path d='M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z' />
			</svg>
			<span>{formatNumber(repo.forks)}</span>
		</Stat>
	)

	const downloadsStat = repo.downloads !== undefined
		? (
			<Stat label={labels.downloads}>
				<svg
					className='w-4 h-4'
					fill='currentColor'
					viewBox='0 0 16 16'
				>
					<path d='M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z' />
					<path d='M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z' />
				</svg>
				<span>{formatNumber(repo.downloads)}</span>
			</Stat>
		)
		: null

	const additionsStat = repo.additions !== undefined
		? (
			<div className='flex items-center gap-1 text-green-600 dark:text-green-400 relative group/stat'>
				<span>+</span>
				<span>{formatNumber(repo.additions)}</span>
				<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
					{labels.additions}
				</span>
			</div>
		)
		: null

	const deletionsStat = repo.deletions !== undefined
		? (
			<div className='flex items-center gap-1 text-red-600 dark:text-red-400 relative group/stat'>
				<span>-</span>
				<span>{formatNumber(repo.deletions)}</span>
				<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
					{labels.deletions}
				</span>
			</div>
		)
		: null

	return (
		<div className='flex items-center gap-4 text-sm text-muted-foreground mt-auto pt-4 border-t border-border/30 flex-wrap relative z-10'>
			{repo.language && (
				<div className='flex items-center gap-1.5'>
					<span
						className='w-3 h-3 rounded-full'
						style={{ backgroundColor: repo.languageColor }}
					/>
					<span>{repo.language}</span>
				</div>
			)}

			{isPR
				? (
					<>
						{additionsStat}
						{deletionsStat}
						{starsStat}
						{!isZedPR && forksStat}
						{downloadsStat}
						{repo.prState && (
							<span
								className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
									prStateColors[repo.prState]
								}`}
							>
								{labels.prState[repo.prState]}
							</span>
						)}
					</>
				)
				: isZedExtension
				? (
					<>
						{starsStat}
						{forksStat}
						{downloadsStat}
						{repo.zedExtensionUrl && (
							<a
								href={repo.zedExtensionUrl}
								aria-label={labels.viewInZed}
								className='inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
							>
								{labels.viewInZed}
							</a>
						)}
					</>
				)
				: (
					<>
						{starsStat}
						{forksStat}
					</>
				)}
		</div>
	)
}
