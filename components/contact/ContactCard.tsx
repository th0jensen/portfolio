import ContactActions from '~/components/contact/ContactActions.tsx'

interface ContactCardProps {
	description: string
	email: string
	githubLabel: string
	linkedinLabel: string
	resumeLabel: string
	resumeHref: string
}

export default function ContactCard({
	description,
	email,
	githubLabel,
	linkedinLabel,
	resumeLabel,
	resumeHref,
}: ContactCardProps) {
	return (
		<div className='glass-card rounded-2xl p-8 md:p-10 flex flex-col gap-6'>
			<p className='text-muted-foreground leading-relaxed max-w-2xl'>
				{description}
			</p>
			<ContactActions
				email={email}
				githubLabel={githubLabel}
				linkedinLabel={linkedinLabel}
				resumeLabel={resumeLabel}
				resumeHref={resumeHref}
			/>
		</div>
	)
}
