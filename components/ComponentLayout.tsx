import type { ComponentChildren } from 'preact'

export interface LayoutProps {
	children: ComponentChildren
	id: string
}

export default function ComponentLayout(
	{ children, id }: LayoutProps,
) {
	const scrollMarginClass = id === 'hero' ? '' : 'scroll-mt-24'
	return (
		<section
			id={id}
			class={`min-h-[calc(100vh-4rem)] w-full overflow-x-hidden px-4 sm:px-0 ${scrollMarginClass}`}
		>
			{children}
		</section>
	)
}
