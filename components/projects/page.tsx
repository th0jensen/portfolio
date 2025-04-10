import Layout from '~/components/ComponentLayout.tsx'

export default function Projects() {
	return (
		<Layout id='projects'>
			<div className='container mx-auto max-w-6xl px-4 py-20 flex flex-col items-center'>
				<div className='w-full mb-12 flex flex-col'>
					<h2 className='text-sm font-medium tracking-wider text-muted-foreground uppercase mb-2'>Coming Soon</h2>
					<h3 className='text-3xl font-bold'>Future Projects</h3>
				</div>
				<ConstructionCard />
			</div>
		</Layout>
	)
}

function ConstructionCard() {
	return (
		<div className='max-w-md mx-auto'>
			<div className='mb-6 flex items-center gap-3'>
				{/* <div className='bg-foreground p-3 flex items-center justify-center'>
					<HardHat className='h-5 w-5 text-background' />
				</div> */}
				<h2 className='text-xl font-medium'>🚧 Under Construction</h2>
			</div>
			<div className='py-4'>
				<p className='mb-8 text-muted-foreground'>
					I'm currently working on exciting new projects to showcase in this section.
					Please check back soon for updates!
				</p>
				<div className='mt-8 flex items-center gap-3'>
					<div className='w-12 h-1 bg-foreground'></div>
					<div className='w-3 h-1 bg-foreground/50'></div>
					<div className='w-3 h-1 bg-foreground/30'></div>
				</div>
			</div>
		</div>
	)
}
