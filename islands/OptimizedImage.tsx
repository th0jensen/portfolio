interface OptimizedImageProps {
	src: string
	alt: string
	width: number
	height: number
	className?: string
	priority?: boolean
}

export default function OptimizedImage({
	src,
	alt,
	width,
	height,
	className = '',
	priority = false,
}: OptimizedImageProps) {
	return (
		<img
			src={src}
			alt={alt}
			width={width}
			height={height}
			loading={priority ? 'eager' : 'lazy'}
			decoding={priority ? 'sync' : 'async'}
			fetchPriority={priority ? 'high' : 'auto'}
			className={`h-auto object-contain ${className}`}
		/>
	)
}
