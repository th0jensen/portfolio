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
	const displayName = t('common.metadata.altName')
	const headshotUrl = '/api/images/headshot.jpg'

	return (
		<Layout id='hero'>
			<div className='absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5' />
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute left-[5%] top-[20%] h-96 w-96 rounded-full bg-primary/8 blur-3xl' />
				<div className='absolute right-[10%] bottom-[20%] h-80 w-80 rounded-full bg-accent/10 blur-3xl' />
			</div>
			<div className='absolute top-0 left-0 right-0 md:hidden h-[62vh] overflow-visible z-0'>
				<img
					src={headshotUrl}
					alt={t('common.hero.headshotAlt')}
					fetchpriority='high'
					width={1200}
					height={1600}
					className='h-full w-full object-cover object-[50%_35%]'
				/>
			</div>
			<div className='pointer-events-none absolute top-[120px] left-0 right-0 h-[calc(62vh-100px)] bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(35%+50px),hsl(var(--background))_75%,hsl(var(--background))_100%)] dark:bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(35%+50px),hsl(var(--background))_75%,hsl(var(--background))_100%)] md:hidden z-10' />

			<div className='container relative z-20 mx-auto max-w-6xl flex flex-col h-[calc(100vh-64px)] justify-between'>
				<div className='grid items-start md:items-center flex-grow grid-cols-1 md:grid-cols-5 gap-8 md:gap-16 pt-[calc(32vh+75px)] sm:pt-[calc(28vh+75px)] md:pt-[75px]'>
					<div className='relative md:col-span-3'>
						<div className='relative z-10 space-y-4 lg:space-y-5'>
							<div className='space-y-2'>
								<p className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
									{t('common.hero.role')}
								</p>
								<h1 className='text-4xl font-bold tracking-tight lg:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-relaxed pb-2'>
									{displayName}
								</h1>
							</div>

							<p className='max-w-2xl text-base lg:text-lg leading-relaxed text-black/85 dark:text-muted-foreground'>
								{description}
							</p>

							<div className='hidden md:flex flex-wrap gap-3'>
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

							<div className='md:hidden flex flex-col gap-3 mt-4 items-start'>
								<div className='flex gap-3'>
									<GitHubButton
										ariaLabel={t('common.hero.github')}
										buttonText={t('common.buttons.github')}
									/>
									<LinkedInButton
										ariaLabel={t('common.hero.linkedin')}
										buttonText={t(
											'common.buttons.linkedin',
										)}
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
					</div>

					<div className='hidden md:flex justify-center items-center md:col-span-2'>
						<div className='max-h-[calc(100vh-140px)] rounded-xl overflow-hidden'>
							<img
								src={headshotUrl}
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
