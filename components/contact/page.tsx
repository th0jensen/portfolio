import Layout from '~/components/ComponentLayout.tsx'
import SectionHeader from '~/components/SectionHeader.tsx'
import ContactCard from '~/components/contact/ContactCard.tsx'
import { toApiAssetUrl } from '~/lib/assets.ts'

interface ContactPageProps {
	t: (key: string, params?: Record<string, string>) => string
}

export default function ContactPage({ t }: ContactPageProps) {
	const email = 'thomas.jensen_@outlook.com'

	return (
		<Layout id='contact'>
			<div className='container mx-auto max-w-6xl py-20'>
				<SectionHeader
					subtitle={t('common.nav.contact')}
					title={t('common.nav.contact')}
				/>
				<ContactCard
					description={t('common.metadata.description')}
					email={email}
					githubLabel={t('common.buttons.github')}
					linkedinLabel={t('common.buttons.linkedin')}
					resumeLabel={t('common.buttons.resume')}
					resumeHref={toApiAssetUrl('/resume.pdf')}
				/>
			</div>
		</Layout>
	)
}
