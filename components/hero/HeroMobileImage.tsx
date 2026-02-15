interface HeroMobileImageProps {
	headshotUrl: string
	alt: string
}

export default function HeroMobileImage({ headshotUrl, alt }: HeroMobileImageProps) {
	return (
		<>
			<div className='absolute top-0 left-0 right-0 md:hidden h-[62vh] overflow-visible z-0'>
				<img
					src={headshotUrl}
					alt={alt}
					fetchpriority='high'
					width={1200}
					height={1600}
					className='h-full w-full object-cover object-[50%_35%]'
				/>
			</div>
			<div className='pointer-events-none absolute top-[120px] left-0 right-0 h-[calc(62vh-100px)] bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(35%+50px),hsl(var(--background))_75%,hsl(var(--background))_100%)] dark:bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(35%+50px),hsl(var(--background))_75%,hsl(var(--background))_100%)] md:hidden z-10' />
		</>
	)
}
