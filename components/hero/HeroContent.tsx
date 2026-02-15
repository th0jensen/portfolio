import HeroActions from '~/components/hero/HeroActions.tsx'

interface HeroContentProps {
	displayName: string
	description: string
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
	roleLabel,
	exploreWorkLabel,
	githubAriaLabel,
	githubText,
	linkedinAriaLabel,
	linkedinText,
	workHref,
}: HeroContentProps) {
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
			</div>
		</div>
	)
}
