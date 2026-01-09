export default function HeadshotMask({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
	return (
		<div className={`relative ${className}`}>
			<svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
				<defs>
					<mask id="diagonal-pills-mask-img">
						<rect x="-20" y="35" width="140" height="30" rx="15" ry="15" fill="white" transform="rotate(15 50 50)" />
						<rect x="-10" y="15" width="120" height="18" rx="9" ry="9" fill="white" transform="rotate(15 50 50)" />
						<rect x="-10" y="67" width="120" height="18" rx="9" ry="9" fill="white" transform="rotate(15 50 50)" />
					</mask>
				</defs>
				<image href={src} width="100" height="100" preserveAspectRatio="xMidYMid slice" mask="url(#diagonal-pills-mask-img)" />
			</svg>
		</div>
	)
}
