import Layout from '~/components/ComponentLayout.tsx'
import { calculateAge } from '~/components/hero/index.ts'
import SmoothScrollButton from '~/islands/SmoothScrollButton.tsx'
import GitHubButton from '~/components/ui/GitHubButton.tsx'
import LinkedInButton from '~/components/ui/LinkedInButton.tsx'
import type { About } from '~/lib/schemas.ts'

interface HeroProps {
	about: About
	t: (key: string, params?: Record<string, string>) => string
}

export default function Hero({ about, t }: HeroProps) {
	const age = calculateAge(about.birthday).toString()
	const description = t('common.hero.description').replace('{age}', age)

	return (
		<Layout id='hero'>
			<div className='absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5' />
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute left-[5%] top-[20%] h-96 w-96 rounded-full bg-primary/8 blur-3xl' />
				<div className='absolute right-[10%] bottom-[20%] h-80 w-80 rounded-full bg-accent/10 blur-3xl' />
			</div>

			<div className='container relative z-10 mx-auto max-w-6xl flex flex-col h-[calc(100vh-64px)] justify-between'>
				<div className='grid items-start lg:items-center flex-grow grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16 pt-4 lg:pt-0'>
					<div className='lg:hidden flex justify-center -mt-4 mb-4'>
						<div className='rounded-xl overflow-hidden'>
							<img
								src='/headshot.webp'
								alt={t('common.hero.headshotAlt')}
								fetchpriority='high'
								width={360}
								height={540}
								className='w-36 sm:w-48 md:w-48 h-auto'
							/>
						</div>
					</div>

					<div className='space-y-4 lg:space-y-5 lg:col-span-3'>
						<div className='space-y-2'>
							<p className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
								{t('common.hero.role')}
							</p>
							<h1 className='text-4xl font-bold tracking-tight lg:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-relaxed pb-2'>
								{about.firstName} {about.lastName}
							</h1>
						</div>

						<p className='max-w-2xl text-base lg:text-lg leading-relaxed text-muted-foreground'>
							{description}
						</p>

						<div className='hidden lg:flex flex-wrap gap-3'>
							<SmoothScrollButton
								targetId='work'
								className='group'
								size='lg'
							>
								<span className='flex items-center'>
									{t('common.hero.exploreWork')}
								</span>
							</SmoothScrollButton>
							<GitHubButton
								ariaLabel={t('common.hero.github')}
								buttonText={t('common.buttons.github')}
							/>
							<LinkedInButton
								ariaLabel={t('common.hero.linkedin')}
								buttonText={t('common.buttons.linkedin')}
							/>
						</div>

						<div className='lg:hidden flex flex-col gap-3 mt-4 items-start'>
							<div className='flex gap-3'>
								<GitHubButton
									ariaLabel={t('common.hero.github')}
									buttonText={t('common.buttons.github')}
								/>
								<LinkedInButton
									ariaLabel={t('common.hero.linkedin')}
									buttonText={t('common.buttons.linkedin')}
								/>
							</div>
							<SmoothScrollButton
								targetId='work'
								className='group'
								size='lg'
							>
								<span className='flex items-center justify-center'>
									{t('common.hero.exploreWork')}
								</span>
							</SmoothScrollButton>
						</div>
					</div>

					<div className='hidden lg:flex justify-center items-center lg:col-span-2'>
						<div className='max-h-[calc(100vh-140px)] rounded-xl overflow-hidden'>
							<img
								src='/headshot.webp'
								alt={t('common.hero.headshotAlt')}
								fetchpriority='high'
								width={360}
								height={540}
								className='w-auto h-full max-h-[calc(100vh-140px)] object-contain'
							/>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	)
}
