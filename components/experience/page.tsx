import Layout from '~/components/ComponentLayout.tsx'
import type { Experience } from '~/lib/data/types.ts'
import Entry from '~/components/Entry.tsx'

interface ExperiencePageProps {
	experience: Experience[]
	t: (key: string, params?: Record<string, string>) => string
}

export default function ExperiencePage({ experience, t }: ExperiencePageProps) {
	const sortedExperience = [...experience].sort((a, b) => {
		const dateA = new Date(a.date)
		const dateB = new Date(b.date)
		return dateA.getTime() - dateB.getTime()
	})
		.reverse()
	return (
		<Layout id='experience'>
			<div className='container mx-auto max-w-6xl px-4 py-20'>
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-x-16'>
					<div className='lg:sticky lg:top-20 lg:self-start mb-12 lg:mb-0 h-fit'>
						<h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3'>
							{t('common.experience.subtitle')}
						</h2>
						<h3 className='text-3xl font-bold tracking-tight'>
							{t('common.experience.title')}
						</h3>
						<p className='mt-4 text-muted-foreground/90 leading-relaxed max-w-md'>
							{t('common.experience.description')}
						</p>
					</div>
					<div>
						{sortedExperience.map((entry, index) => (
							<Entry key={index} entry={entry} />
						))}
					</div>
				</div>
			</div>
		</Layout>
	)
}
