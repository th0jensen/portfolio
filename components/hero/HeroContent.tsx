import HeroActions from '~/components/hero/HeroActions.tsx'

const CURRENTLY_BUILDING_PROJECT_NAME = 'Crabdash'
const CURRENTLY_BUILDING_PROJECT_URL = 'https://github.com/th0jensen/crabdash'

interface HeroContentProps {
	displayName: string
	description: string
	currentlyBuilding: string
	roleLabel: string
	exploreWorkLabel: string
	githubAriaLabel: string
	githubText: string
	linkedinAriaLabel: string
	linkedinText: string
	workHref: string
}

export default function HeroContent({
	displayName,
	description,
	currentlyBuilding,
	roleLabel,
	exploreWorkLabel,
	githubAriaLabel,
	githubText,
	linkedinAriaLabel,
	linkedinText,
	workHref,
}: HeroContentProps) {
	const projectNameIndex = currentlyBuilding.indexOf(
		CURRENTLY_BUILDING_PROJECT_NAME,
	)

	const currentlyBuildingContent = projectNameIndex === -1
		? (
			<>
				{currentlyBuilding}{' '}
				<a
					href={CURRENTLY_BUILDING_PROJECT_URL}
					target='_blank'
					rel='noopener noreferrer'
					className='font-semibold text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground/70'
				>
					{CURRENTLY_BUILDING_PROJECT_NAME}
				</a>
			</>
		)
		: (
			<>
				{currentlyBuilding.slice(0, projectNameIndex)}
				<a
					href={CURRENTLY_BUILDING_PROJECT_URL}
					target='_blank'
					rel='noopener noreferrer'
					className='font-semibold text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground/70'
				>
					{CURRENTLY_BUILDING_PROJECT_NAME}
				</a>
				{currentlyBuilding.slice(
					projectNameIndex + CURRENTLY_BUILDING_PROJECT_NAME.length,
				)}
			</>
		)

	return (
		<div className='relative md:col-span-3'>
			<div className='relative z-10 space-y-4 lg:space-y-5'>
				<div className='space-y-2'>
					<p className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
						{roleLabel}
					</p>
					<h1 className='text-4xl font-bold tracking-tight lg:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-relaxed pb-2'>
						{displayName}
					</h1>
				</div>

				<p className='max-w-2xl text-base lg:text-lg leading-relaxed text-black/85 dark:text-muted-foreground'>
					{description}
				</p>

				<HeroActions
					workHref={workHref}
					label={exploreWorkLabel}
					githubAriaLabel={githubAriaLabel}
					githubText={githubText}
					linkedinAriaLabel={linkedinAriaLabel}
					linkedinText={linkedinText}
					layout='desktop'
				/>

				<HeroActions
					workHref={workHref}
					label={exploreWorkLabel}
					githubAriaLabel={githubAriaLabel}
					githubText={githubText}
					linkedinAriaLabel={linkedinAriaLabel}
					linkedinText={linkedinText}
					layout='mobile'
				/>

				<p className='max-w-2xl pt-4 md:pt-8 text-sm md:text-base text-black/75 dark:text-foreground/80'>
					{currentlyBuildingContent}
				</p>
			</div>
		</div>
	)
}
