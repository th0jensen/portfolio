import Layout from '~/components/ComponentLayout.tsx'
import type { Experience } from '~/lib/data/types.ts'
import Entry from '~/islands/Entry.tsx'

export default function ExperiencePage(
	{ experience }: { experience: Experience[] },
) {
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
						<h2 className='text-sm font-medium tracking-wider text-muted-foreground uppercase mb-2'>
							Career Path
						</h2>
						<h3 className='text-3xl font-bold'>My Experience</h3>
						<p className='mt-4 text-muted-foreground max-w-md'>
							A chronological overview of my professional journey
							and key milestones.
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
