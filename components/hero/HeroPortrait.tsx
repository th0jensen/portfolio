interface HeroPortraitProps {
	headshotUrl: string
	alt: string
}

export default function HeroPortrait({ headshotUrl, alt }: HeroPortraitProps) {
	return (
		<div className='hidden md:flex justify-center items-center md:col-span-2'>
			<div className='max-h-[calc(100vh-140px)] rounded-xl overflow-hidden'>
				<img
					src={headshotUrl}
					alt={alt}
					fetchpriority='high'
					width={360}
					height={540}
					className='w-auto h-full max-h-[calc(100vh-140px)] object-contain'
				/>
			</div>
		</div>
	)
}
