import Layout from '~/components/ComponentLayout.tsx'
import type { Data } from '~/lib/data/types.ts'
import { calculateAge } from '~/components/hero/index.ts'
import SmoothScrollButton from '~/islands/SmoothScrollButton.tsx'
import GitHubButton from '~/components/ui/GitHubButton.tsx'
import LinkedInButton from '~/components/ui/LinkedInButton.tsx'

export default function Hero({ about }: { about: Data['about'] }) {
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

			{/* Subtle gradient background */}
			<div className='absolute inset-0 bg-gradient-to-b from-background to-background/60 dark:from-background dark:to-background/80' />

			{/* Minimal shapes for visual interest */}
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute left-[10%] top-[30%] h-64 w-64 rounded-full bg-primary/5 blur-3xl' />
				<div className='absolute right-[15%] top-[60%] h-80 w-80 rounded-full bg-secondary/5 blur-3xl' />
			</div>

			<div className='container relative z-10 mx-auto max-w-6xl px-4 flex flex-col h-[calc(100vh-64px)] justify-between'>
				<div className='grid items-start lg:items-center flex-grow grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16 pt-4 lg:pt-0'>
					{/* Mobile Headshot (shown only on mobile) */}
					<div className='lg:hidden relative overflow-hidden flex justify-center -mt-4 mb-4'>
						<div className='relative w-48 md:w-64'>
							<img
								src='/headshot.png'
								alt='Profile'
								className='w-full h-auto object-contain animate-fade-in'
							/>
						</div>
					</div>

					{/* Content */}
					<div className='space-y-6 lg:space-y-8 lg:col-span-3'>
						<div className='space-y-2 animate-slide-up animate-delay-1'>
							<p className='text-sm font-medium tracking-wider text-muted-foreground uppercase'>
								Full Stack Software Developer
							</p>
							<h1 className='text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl'>
								{about.firstName} {about.lastName}
							</h1>
						</div>

						<p className='max-w-2xl text-lg text-muted-foreground animate-slide-up animate-delay-2'>
							{age}{' '}
							year old developer focused on creating elegant
							solutions through clean code. Passionate about
							backend services, optimization, and creating
							seamless user experiences.
						</p>

						{/* Button section - Desktop only */}
						<div className='hidden lg:flex flex-wrap gap-4 animate-slide-up animate-delay-3'>
							<SmoothScrollButton
								targetId='work'
								className='group'
								size='lg'
							>
								<span className='flex items-center'>
									Explore my work
								</span>
							</SmoothScrollButton>

							<GitHubButton />
							<LinkedInButton />
						</div>

						{/* Mobile buttons - Shown below content on mobile and aligned to the right */}
						<div className='lg:hidden flex flex-col space-y-4 animate-slide-up animate-delay-3 mt-6 mb-6 items-end'>
							<div className='flex space-x-3'>
								<GitHubButton />
								<LinkedInButton />
							</div>
							<div className='inline-block'>
								<SmoothScrollButton
									targetId='work'
									className='group inline-flex'
									size='lg'
								>
									<span className='flex items-center'>
										Explore my work
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
								className='h-auto max-h-[calc(100vh-140px)] w-auto object-contain'
							/>
						</div>
					</div>

				</div>
			</div>
		</Layout>
	)
}
