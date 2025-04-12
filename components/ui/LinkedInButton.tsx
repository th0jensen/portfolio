import ExternalLink from '~/islands/ExternalLink.tsx'
import GeneratedIcon from 'https://icons.church/mdi/linkedin'

export default function LinkedInButton() {
	return (
		<ExternalLink
			href='https://www.linkedin.com/in/thomas-jensen-75a488208/'
			variant='secondary'
			size='lg'
			ariaLabel='LinkedIn profile'
		>
			<span className='flex items-center gap-2'>
				<GeneratedIcon /> LinkedIn
			</span>
		</ExternalLink>
	)
}
