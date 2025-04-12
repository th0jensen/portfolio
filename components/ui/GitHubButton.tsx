import ExternalLink from '~/islands/ExternalLink.tsx'
import GeneratedIcon from 'https://icons.church/mdi/github'

export default function GitHubButton() {
	return (
		<ExternalLink
			href='https://github.com/th0jensen'
			variant='secondary'
			size='lg'
			ariaLabel='GitHub profile'
		>
			<span className='flex items-center gap-2'>
				<GeneratedIcon /> GitHub
			</span>
		</ExternalLink>
	)
}
