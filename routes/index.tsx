import Hero from '~/components/hero/page.tsx'
import Work from '~/components/work/page.tsx'
import Experience from '~/components/experience/page.tsx'
// import Projects from '~/components/projects/page.tsx'
import data from '~/lib/data/en.ts'

export default function Home() {
	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Hero about={data.about} />
			<Work projects={data.projects} />
			<Experience experience={data.experience} />
			{/* <Projects /> */}
		</div>
	)
}
