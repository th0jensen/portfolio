import type { Experience } from '~/lib/data/types.ts'

export default function Entry({ entry }: { entry: Experience }) {
	return (
		<div className='mb-10 flex group'>
			<div className='w-24 shrink-0 text-right mr-6 pt-[3px]'>
				<div className='text-xs text-muted-foreground font-semibold tracking-wide'>
					{entry.date}
				</div>
			</div>
			<div className='flex-1 glass-card rounded-xl p-5 smooth-transition hover:shadow-md'>
				<div className='flex flex-col'>
					<h3 className='text-base font-semibold mb-2 group-hover:text-primary smooth-transition'>
						{entry.title}
					</h3>
					<p className='text-sm text-muted-foreground/90 leading-relaxed'>
						{entry.description}
					</p>
				</div>
			</div>
		</div>
	)
}
