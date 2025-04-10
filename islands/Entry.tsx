import type { Experience } from '~/lib/data/types.ts'
import { useState } from 'preact/hooks'

export default function Entry({ entry }: { entry: Experience }) {
	const [_expanded, _setExpanded] = useState<boolean>(entry.expanded)

	return (
		<div className='mb-8 flex'>
			<div className='w-24 shrink-0 text-right mr-6 pt-[3px]'>
				<div className='text-xs text-muted-foreground font-normal tracking-wide'>
					{entry.date}
				</div>
			</div>
			<div className='flex-1'>
				<div className='flex flex-col'>
					<h3 className='text-base font-medium mb-2'>
						{entry.title}
					</h3>
					<p className='text-sm text-muted-foreground'>
						{entry.description}
					</p>
				</div>
			</div>
		</div>
	)
}
