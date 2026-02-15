import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import ContactPage from '~/components/contact/page.tsx'

export default define.page(function ContactRoutePage(props) {
	const t = createTranslator(props.state.translationData || {})

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<ContactPage t={t} />
		</div>
	)
})
