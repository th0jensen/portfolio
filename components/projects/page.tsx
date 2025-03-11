import Layout from '~/components/ComponentLayout.tsx'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '~/components/ui/card.tsx'
import { HardHat } from 'lucide-preact'

export default function Projects() {
	return (
		<Layout id='projects'>
			<div className='container min-h-screen px-4 py-8 md:px-8 lg:px-16 justify-center items-center flex flex-col'>
				<h2 className='text-2xl font-bold mb-6 md:mb-8'>Projects</h2>
				{
					/* <div className='flex flex-wrap gap-6 md:gap-8 max-w-[750px]'>
					<ShowcaseCard />
				</div> */
				}
				<Component />
			</div>
		</Layout>
	)
}

function Component() {
	return (
		<Card className='w-full max-w-md mx-auto overflow-hidden'>
			<CardHeader className='bg-yellow-100 dark:bg-yellow-900'>
				<CardTitle className='flex items-center justify-center text-2xl font-bold text-yellow-800 dark:text-yellow-100'>
					<span className='mr-2'>
						{HardHat && HardHat({ size: 32 })}
					</span>
					Under Construction
				</CardTitle>
			</CardHeader>
			<CardContent className='p-6 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900 dark:to-gray-900'>
				<p className='text-center text-gray-600 dark:text-gray-300'>
					I'm working hard to add this section of the page. Please
					check back soon for updates!
				</p>
				<div className='mt-4 flex justify-center'>
					<div className='w-16 h-1 bg-yellow-400 rounded-full animate-pulse'>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
