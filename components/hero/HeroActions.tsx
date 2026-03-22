import GitHubButton from '~/components/ui/GitHubButton.tsx'
import LinkedInButton from '~/components/ui/LinkedInButton.tsx'
import { Link } from '~/components/ui/button.tsx'

interface HeroActionsProps {
	workHref: string
	label: string
	githubAriaLabel: string
	githubText: string
	linkedinAriaLabel: string
	linkedinText: string
	layout: 'desktop' | 'mobile'
}

export default function HeroActions({
	workHref,
	label,
	githubAriaLabel,
	githubText,
	linkedinAriaLabel,
	linkedinText,
	layout,
}: HeroActionsProps) {
	if (layout === 'desktop') {
		return (
			<div className='hidden md:flex flex-wrap items-center gap-3 pt-1'>
				<Link
					href={workHref}
					variant='default'
					size='lg'
					className='group min-w-[12rem]'
				>
					<span className='flex items-center justify-center'>
						{label}
					</span>
				</Link>
				<GitHubButton
					ariaLabel={githubAriaLabel}
					buttonText={githubText}
					className='min-w-[10rem]'
				/>
				<LinkedInButton
					ariaLabel={linkedinAriaLabel}
					buttonText={linkedinText}
					className='min-w-[10rem]'
				/>
			</div>
		)
	}

	return (
		<div className='md:hidden flex w-full max-w-sm flex-col gap-3 pt-1 items-start'>
			<Link
				href={workHref}
				variant='default'
				size='lg'
				className='group'
			>
				<span className='flex items-center justify-center'>
					{label}
				</span>
			</Link>
			<div className='flex gap-3'>
				<GitHubButton
					ariaLabel={githubAriaLabel}
					buttonText={githubText}
				/>
				<LinkedInButton
					ariaLabel={linkedinAriaLabel}
					buttonText={linkedinText}
				/>
			</div>
		</div>
	)
}
