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
			<div className='hidden md:flex flex-wrap gap-3'>
				<Link
					href={workHref}
					variant='default'
					size='lg'
					className='group'
				>
					<span className='flex items-center'>{label}</span>
				</Link>
			<GitHubButton
				ariaLabel={githubAriaLabel}
				buttonText={githubText}
			/>
			<LinkedInButton
				ariaLabel={linkedinAriaLabel}
				buttonText={linkedinText}
			/>
		</div>
	)
}

	return (
		<div className='md:hidden flex flex-col gap-3 mt-4 items-start'>
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
			<Link href={workHref} variant='default' size='lg' className='group'>
				<span className='flex items-center justify-center'>{label}</span>
			</Link>
		</div>
	)
}
