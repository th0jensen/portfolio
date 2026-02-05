import { createTranslator } from 'fresh-i18n'
import Work from './page.tsx'
import { getLocaleContent } from '~/lib/db/content.ts'
import type { Project } from '~/lib/schemas.ts'

interface WorkSectionProps {
	locale: string
}

export default async function WorkSection({ locale }: WorkSectionProps) {
	const content = await getLocaleContent(locale)
	const t = createTranslator({ common: content ?? {} })
	const projects: Project[] = content?.projects ?? []

	return <Work projects={projects} t={t} />
}
