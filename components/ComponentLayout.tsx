import type { ComponentChildren } from 'preact'

export interface LayoutProps {
	children: ComponentChildren
	id: string
}

export default function ComponentLayout(
	{ children, id }: LayoutProps,
) {
	const spacerClass = id === 'hero' ? 'hidden' : 'pb-16'
	return (
		<div
			id={id}
			class='min-h-screen w-full overflow-x-hidden px-4 sm:px-0'
		>
			<div class={spacerClass}></div>
			{children}
		</div>
	)
}
