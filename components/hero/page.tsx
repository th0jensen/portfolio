import Layout from '~/components/ComponentLayout.tsx'
import { calculateAge } from '~/components/hero/index.ts'
import HeroBackground from '~/components/hero/HeroBackground.tsx'
import HeroMobileImage from '~/components/hero/HeroMobileImage.tsx'
import HeroContent from '~/components/hero/HeroContent.tsx'
import HeroPortrait from '~/components/hero/HeroPortrait.tsx'
import type { About } from '~/lib/schemas.ts'

interface HeroProps {
	about: About
	t: (key: string, params?: Record<string, string>) => string
	workHref?: string
}

export default function Hero({ about, t, workHref = '#work' }: HeroProps) {
	const age = calculateAge(about.birthday).toString()
	const description = t('common.hero.description').replace('{age}', age)
	const currentlyBuilding = t('common.hero.currentlyBuilding')
	const displayName = t('common.metadata.altName')
	const headshotUrl = '/headshot.jpg'
	const heroImageAlt = t('common.hero.headshotAlt')

	return (
		<Layout id='hero'>
			<HeroBackground />
			<HeroMobileImage headshotUrl={headshotUrl} alt={heroImageAlt} />

			<div className='container relative z-20 mx-auto flex max-w-6xl flex-col justify-center min-h-[calc(100svh-64px)] md:min-h-[calc(100vh-64px)]'>
				<div className='grid flex-grow grid-cols-1 items-start gap-8 pt-[calc(21vh+64px)] pb-10 sm:pt-[calc(20vh+64px)] md:items-center md:gap-16 md:pt-6 md:pb-0'>
					<HeroContent
						displayName={displayName}
						description={description}
						currentlyBuilding={currentlyBuilding}
						roleLabel={t('common.hero.role')}
						exploreWorkLabel={t('common.hero.exploreWork')}
						githubAriaLabel={t('common.hero.github')}
						githubText={t('common.buttons.github')}
						linkedinAriaLabel={t('common.hero.linkedin')}
						linkedinText={t('common.buttons.linkedin')}
						workHref={workHref}
					/>
					<HeroPortrait
						headshotUrl={headshotUrl}
						alt={heroImageAlt}
					/>
				</div>
			</div>
		</Layout>
	)
}
