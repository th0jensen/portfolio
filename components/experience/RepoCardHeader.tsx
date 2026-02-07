import type { FormattedRepo } from '~/lib/schemas.ts'
import type { RepoUiLabels } from './repoLabels.ts'

interface RepoCardHeaderProps {
	repo: FormattedRepo
	labels: RepoUiLabels
	isLarge: boolean
}

export default function RepoCardHeader({
	repo,
	labels,
	isLarge,
}: RepoCardHeaderProps) {
	const isPR = repo.type === 'pr'
	const isZedExtension = repo.type === 'zed-extension'

	return (
		<div className='flex items-start justify-between mb-3 relative z-10'>
			<a
				href={repo.url}
				target='_blank'
				rel='noopener noreferrer'
				aria-label={labels.visitRepo(repo.name)}
				className='flex items-center gap-2 text-muted-foreground rounded-lg -ml-2 px-2 py-2 min-h-11 smooth-transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
			>
				{isPR
					? (
						<svg
							className='w-5 h-5'
							fill='currentColor'
							viewBox='0 0 16 16'
						>
							<path d='M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z' />
						</svg>
					)
					: isZedExtension
					? (
						<svg
							className='w-5 h-5'
							fill='currentColor'
							viewBox='0 0 16 16'
						>
							<path d='M8.5 5.5a.5.5 0 0 0-1 0v3.362l-1.429 2.38a.5.5 0 1 0 .858.515l1.5-2.5A.5.5 0 0 0 8.5 9V5.5z' />
							<path d='M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3zM6 1.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1z' />
							<path d='M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9zm1.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-9z' />
						</svg>
					)
					: (
						<svg
							className='w-5 h-5'
							fill='currentColor'
							viewBox='0 0 16 16'
						>
							<path d='M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z' />
						</svg>
					)}
				<span
					className={`font-semibold ${isLarge ? 'text-lg' : 'text-sm'}`}
				>
					{repo.name}
					{isPR && repo.prNumber && (
						<span className='text-muted-foreground font-normal'>
							#{repo.prNumber}
						</span>
					)}
				</span>
			</a>
			<div className='flex items-center gap-2'>
				<svg
					className='w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 smooth-transition'
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth={2}
						d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
					/>
				</svg>
			</div>
		</div>
	)
}
