import Layout from '~/components/ComponentLayout.tsx'
import type { FormattedRepo } from '~/lib/schemas.ts'

interface ExperiencePageProps {
	repos?: FormattedRepo[]
	t: (key: string, params?: Record<string, string>) => string
}

function formatNumber(num: number): string {
	const abs = Math.abs(num)

	if (abs >= 1_000_000_000) {
		return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b'
	}
	if (abs >= 1_000_000) {
		return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
	}
	if (abs >= 1000) {
		return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
	}
	return num.toString()
}

function RepoCard({
	repo,
	size = 'default',
}: {
	repo: FormattedRepo
	size?: 'large' | 'wide' | 'default'
}) {
	const sizeClasses = {
		large: 'md:col-span-2 md:row-span-2',
		wide: 'md:col-span-2',
		default: '',
	}

	const isLarge = size === 'large'
	const isPR = repo.type === 'pr'
	const isZedExtension = repo.type === 'zed-extension'

	const prStateColors = {
		merged: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
		closed: 'bg-red-500/15 text-red-600 dark:text-red-400',
		open: 'bg-green-500/15 text-green-600 dark:text-green-400',
	}

	const starsStat = (
		<div className='flex items-center gap-1 relative group/stat'>
			<svg className='w-4 h-4' fill='currentColor' viewBox='0 0 16 16'>
				<path d='M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z' />
			</svg>
			<span>{formatNumber(repo.stars)}</span>
			<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
				Stars
			</span>
		</div>
	)

	const forksStat = (
		<div className='flex items-center gap-1 relative group/stat'>
			<svg className='w-4 h-4' fill='currentColor' viewBox='0 0 16 16'>
				<path d='M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z' />
			</svg>
			<span>{formatNumber(repo.forks)}</span>
			<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
				Forks
			</span>
		</div>
	)

	const downloadsStat = repo.downloads !== undefined
		? (
			<div className='flex items-center gap-1 relative group/stat'>
				<svg
					className='w-4 h-4'
					fill='currentColor'
					viewBox='0 0 16 16'
				>
					<path d='M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z' />
					<path d='M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z' />
				</svg>
				<span>{formatNumber(repo.downloads)}</span>
				<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
					Downloads
				</span>
			</div>
		)
		: null

	const additionsStat = repo.additions !== undefined
		? (
			<div className='flex items-center gap-1 text-green-600 dark:text-green-400 relative group/stat'>
				<span>+</span>
				<span>{formatNumber(repo.additions)}</span>
				<span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-foreground bg-background border border-border/50 rounded-md shadow-lg opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
					Additions
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
					Deletions
				</span>
			</div>
		)
		: null

	return (
		<div
			className={`group glass-card overflow-hidden rounded-2xl p-6 smooth-transition hover:shadow-lg hover:border-border/60 flex flex-col relative ${
				sizeClasses[size]
			}`}
		>
			<a
				href={repo.url}
				target='_blank'
				rel='noopener noreferrer'
				className='absolute inset-0 z-0'
				aria-label={`Visit ${repo.name}`}
			/>
			<div className='flex items-start justify-between mb-3 relative z-10'>
				<div className='flex items-center gap-2 text-muted-foreground'>
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
						className={`font-semibold ${
							isLarge ? 'text-lg' : 'text-sm'
						}`}
					>
						{repo.name}
						{isPR && repo.prNumber && (
							<span className='text-muted-foreground font-normal'>
								#{repo.prNumber}
							</span>
						)}
					</span>
				</div>
				<div className='flex items-center gap-2'>
					{isPR && repo.prState && (
						<span
							className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
								prStateColors[repo.prState]
							}`}
						>
							{repo.prState}
						</span>
					)}
					{isZedExtension && repo.zedExtensionUrl && (
						<a
							href={repo.zedExtensionUrl}
							target='_blank'
							rel='noopener noreferrer'
							className='relative z-20 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 smooth-transition flex items-center gap-1'
							onClick={(e) => e.stopPropagation()}
						>
							<svg
								className='w-3 h-3'
								fill='currentColor'
								viewBox='0 0 16 16'
							>
								<path d='M8.5 5.5a.5.5 0 0 0-1 0v3.362l-1.429 2.38a.5.5 0 1 0 .858.515l1.5-2.5A.5.5 0 0 0 8.5 9V5.5z' />
								<path d='M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3zM6 1.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1z' />
								<path d='M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9zm1.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-9z' />
							</svg>
							Zed
						</a>
					)}
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

			<p
				className={`text-muted-foreground leading-relaxed flex-grow relative z-10 whitespace-pre-line ${
					isLarge ? 'text-base mb-6' : 'text-sm mb-4'
				}`}
			>
				{repo.description}
			</p>

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
							{forksStat}
							{downloadsStat}
						</>
					)
					: isZedExtension
					? (
						<>
							{starsStat}
							{forksStat}
							{downloadsStat}
						</>
					)
					: (
						<>
							{starsStat}
							{forksStat}
						</>
					)}
			</div>
		</div>
	)
}

export default function ExperiencePage(
	{ repos = [], t }: ExperiencePageProps,
) {
	const getBentoSize = (index: number): 'large' | 'wide' | 'default' => {
		if (index === 0) return 'large'
		if (index === 3) return 'wide'
		return 'default'
	}

	return (
		<Layout id='experience'>
			<div className='container mx-auto max-w-6xl py-20'>
				<div className='mb-12'>
					<h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3'>
						{t('common.experience.subtitle')}
					</h2>
					<h3 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
						{t('common.experience.title')}
					</h3>
					<p className='text-muted-foreground/90 leading-relaxed max-w-2xl'>
						{t('common.experience.description')}
					</p>
				</div>

				{repos.length > 0
					? (
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 md:auto-rows-[minmax(200px,auto)]'>
							{repos.map((repo, index) => (
								<RepoCard
									key={repo.url}
									repo={repo}
									size={getBentoSize(index)}
								/>
							))}
						</div>
					)
					: (
						<div className='text-center py-12 text-muted-foreground'>
							<p>Loading repositories...</p>
						</div>
					)}
			</div>
		</Layout>
	)
}
