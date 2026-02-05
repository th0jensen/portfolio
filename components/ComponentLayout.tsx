import type { ComponentChildren } from 'preact'

export interface LayoutProps {
	children: ComponentChildren
	id: string
}

export default function ComponentLayout(
	{ children, id }: LayoutProps,
) {
	return (
		<div
			id={id}
			class='min-h-screen w-full overflow-x-hidden px-4 sm:px-0'
		>
			<div class='pb-16'></div>
			{children}
		</div>
	)
}
