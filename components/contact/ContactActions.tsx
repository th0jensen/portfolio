interface ContactActionsProps {
	email: string
	githubLabel: string
	linkedinLabel: string
}

export default function ContactActions({
	email,
	githubLabel,
	linkedinLabel,
}: ContactActionsProps) {
	return (
		<div className='flex flex-wrap items-center gap-3'>
			<a
				href={`mailto:${email}`}
				className='inline-flex items-center justify-center h-12 rounded-xl px-8 bg-primary text-primary-foreground font-semibold smooth-transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
			>
				{email}
			</a>
			<a
				href='https://github.com/th0jensen'
				target='_blank'
				rel='noopener noreferrer'
				className='inline-flex items-center justify-center h-12 rounded-xl px-8 bg-secondary text-secondary-foreground font-semibold smooth-transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
			>
				{githubLabel}
			</a>
			<a
				href='https://www.linkedin.com/in/thomas-jensen-75a488208/'
				target='_blank'
				rel='noopener noreferrer'
				className='inline-flex items-center justify-center h-12 rounded-xl px-8 bg-secondary text-secondary-foreground font-semibold smooth-transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
			>
				{linkedinLabel}
			</a>
		</div>
	)
}
