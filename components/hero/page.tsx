import Layout from '~/components/ComponentLayout.tsx'
import type { Data } from '~/lib/data/types.ts'
import { calculateAge } from '~/components/hero/index.ts'
import SmoothScrollButton from '~/islands/SmoothScrollButton.tsx'
import GitHubButton from '~/components/ui/GitHubButton.tsx'
import LinkedInButton from '~/components/ui/LinkedInButton.tsx'

interface HeroProps {
	about: Data['about']
	t: (key: string, params?: Record<string, string>) => string
}

export default function Hero({ about, t }: HeroProps) {
	const age = calculateAge(about.birthday)

	return (
		<Layout id='hero'>
			<style>
				{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }

        .animate-slide-up {
          animation: slideUp 0.8s ease-out forwards;
        }

        .animate-delay-1 {
          animation-delay: 0.1s;
        }

        .animate-delay-2 {
          animation-delay: 0.3s;
        }

        .animate-delay-3 {
          animation-delay: 0.5s;
        }
      `}
			</style>

			{/* Comet-inspired gradient background with soft ambient lighting */}
			<div className='absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5' />

			{/* Zed-inspired minimal shapes for visual depth */}
			<div className='absolute inset-0 overflow-hidden'>
				<div
					className='absolute left-[5%] top-[20%] h-96 w-96 rounded-full bg-primary/8 blur-3xl animate-pulse'
					style={{ animationDuration: '8s' }}
				/>
				<div
					className='absolute right-[10%] bottom-[20%] h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-pulse'
					style={{ animationDuration: '6s', animationDelay: '2s' }}
				/>
			</div>

			<div className='container relative z-10 mx-auto max-w-6xl px-4 flex flex-col h-[calc(100vh-64px)] justify-between'>
				<div className='grid items-start lg:items-center flex-grow grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16 pt-4 lg:pt-0'>
					{/* Mobile Headshot (shown only on mobile) */}
					<div className='lg:hidden relative overflow-hidden flex justify-center -mt-4 mb-4'>
						<div className='relative w-48 md:w-64'>
							<img
								src='/headshot.png'
								alt='Profile'
								className='w-full h-auto object-contain animate-fade-in rounded-xl'
							/>
						</div>
					</div>

					{/* Content */}
					<div className='space-y-4 lg:space-y-6 lg:col-span-3'>
						<div className='space-y-2 animate-slide-up animate-delay-1'>
							<p className='text-xs font-semibold tracking-widest text-muted-foreground uppercase opacity-80'>
								{t('common.hero.role')}
							</p>
							<h1 className='text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight pb-1'>
								{about.firstName} {about.lastName}
							</h1>
						</div>

						<p className='max-w-2xl text-lg leading-relaxed text-muted-foreground/90 animate-slide-up animate-delay-2'>
							{age} {t('common.hero.description')}
						</p>

						{/* Button section - Desktop only */}
						<div className='hidden lg:flex flex-wrap gap-4 animate-slide-up animate-delay-3'>
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

						{/* Mobile buttons - Shown below content on mobile and aligned to the right */}
						<div className='lg:hidden flex flex-col space-y-4 animate-slide-up animate-delay-3 mt-6 mb-6 items-end'>
							<div className='flex space-x-3'>
								<GitHubButton
									ariaLabel={t('common.hero.github')}
									buttonText={t('common.buttons.github')}
								/>
								<LinkedInButton
									ariaLabel={t('common.hero.linkedin')}
									buttonText={t('common.buttons.linkedin')}
								/>
							</div>
							<div className='inline-block'>
								<SmoothScrollButton
									targetId='work'
									className='group inline-flex'
									size='lg'
								>
									<span className='flex items-center'>
										{t('common.hero.exploreWork')}
									</span>
								</SmoothScrollButton>
							</div>
						</div>
					</div>

					{/* Desktop Profile Image (hidden on mobile) */}
					<div className='hidden lg:flex justify-center items-center lg:col-span-2'>
						<div className='relative animate-fade-in'>
							<img
								src='/headshot.png'
								alt='Profile'
								className='h-auto max-h-[calc(100vh-140px)] w-auto object-contain rounded-xl'
							/>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	)
}
