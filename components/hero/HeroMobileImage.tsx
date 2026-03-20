interface HeroMobileImageProps {
	headshotUrl: string
	alt: string
}

export default function HeroMobileImage(
	{ headshotUrl, alt }: HeroMobileImageProps,
) {
	return (
		<>
			<div className='absolute top-0 left-0 right-0 z-0 h-[58vh] overflow-visible md:hidden'>
				<img
					src={headshotUrl}
					alt={alt}
					// fetchpriority='high'
					width={1200}
					height={1600}
					className='h-full w-full object-cover object-[50%_35%]'
				/>
			</div>
			<div className='pointer-events-none absolute left-0 right-0 top-16 z-10 h-[calc(58vh-64px)] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_22%,transparent_38%,hsl(var(--background))_78%,hsl(var(--background))_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.18)_22%,transparent_38%,hsl(var(--background))_78%,hsl(var(--background))_100%)] md:hidden' />
		</>
	)
}
