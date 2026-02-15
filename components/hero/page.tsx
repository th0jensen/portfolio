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
	const displayName = t('common.metadata.altName')
	const headshotUrl = '/api/images/headshot.jpg'
	const heroImageAlt = t('common.hero.headshotAlt')

	return (
		<Layout id='hero'>
			<HeroBackground />
			<HeroMobileImage headshotUrl={headshotUrl} alt={heroImageAlt} />

			<div className='container relative z-20 mx-auto max-w-6xl flex flex-col h-[calc(100vh-64px)] justify-center'>
				<div className='grid items-start md:items-center flex-grow grid-cols-1 md:grid-cols-5 gap-8 md:gap-16 pt-[calc(26vh+64px)] sm:pt-[calc(24vh+64px)] md:pt-[24px]'>
					<HeroContent
						displayName={displayName}
						description={description}
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
