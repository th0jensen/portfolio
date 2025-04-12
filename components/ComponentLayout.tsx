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
			class='min-h-screen w-screen overflow-x-hidden overflow-y-hidden'
		>
			<div class='pb-16'></div>
			{children}
		</div>
	)
}
