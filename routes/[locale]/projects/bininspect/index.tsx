import { define } from '~/utils.ts'
import BinInspect from '~/islands/BinInspect.tsx'

export default define.page(function BininspectProjectPage(props) {
	const locale = props.state.locale || 'en'

	return <BinInspect locale={locale} />
})
