import { createTranslator } from 'fresh-i18n'
import Hero from './page.tsx'
import { getLocaleContent } from '~/lib/db/content.ts'
import type { About } from '~/lib/schemas.ts'

const DEFAULT_ABOUT: About = {
	firstName: 'Thomas',
	lastName: 'Jensen',
	birthday: '10-12-2003',
	humanLanguages: ['English', 'Norwegian', 'German', 'Hebrew'],
	computerLanguages: ['Typescript', 'Go', 'Swift', 'Rust'],
}

interface HeroSectionProps {
	locale: string
}

export default async function HeroSection({ locale }: HeroSectionProps) {
	const content = await getLocaleContent(locale)
	const t = createTranslator({ common: content ?? {} })
	const about = content?.about ?? DEFAULT_ABOUT

	return <Hero about={about} t={t} />
}
