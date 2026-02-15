export default function HeroBackground() {
	return (
		<>
			<div className='absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5' />
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute left-[5%] top-[20%] h-96 w-96 rounded-full bg-primary/8 blur-3xl' />
				<div className='absolute right-[10%] bottom-[20%] h-80 w-80 rounded-full bg-accent/10 blur-3xl' />
			</div>
		</>
	)
}
