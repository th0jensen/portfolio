import { define } from '~/utils.ts'
import { createTranslator } from 'fresh-i18n'
import Hero from '~/components/hero/page.tsx'
import Work from '~/components/work/page.tsx'
import Experience from '~/components/experience/page.tsx'
import type { Project, Experience as ExperienceType } from '~/lib/data/types.ts'
import data from '~/lib/data/en.ts'

export default define.page(function Home(props) {
	const t = createTranslator(props.state.translationData || {})
	const locale = props.state.locale || 'en'

	// Translate technology names for Hebrew
	const translateTechnologies = (technologies: Record<string, string>) => {
		if (locale !== 'he') return technologies
		const translated: Record<string, string> = {}
		for (const [key, value] of Object.entries(technologies)) {
			const translatedKey = t(`common.technologies.${key}`)
			translated[translatedKey !== `common.technologies.${key}` ? translatedKey : key] = value
		}
		return translated
	}

	// Translate projects
	const translatedProjects: Project[] = data.projects.map((project) => {
		if (project.name.includes('zed')) {
			return {
				...project,
				name: t('common.projects.zed.name'),
				description: t('common.projects.zed.description'),
				technologies: translateTechnologies(project.technologies),
			}
		} else if (project.name === 'Appleosophy') {
			return {
				...project,
				name: t('common.projects.appleosophy.name'),
				description: t('common.projects.appleosophy.description'),
				technologies: translateTechnologies(project.technologies),
			}
		}
		return project
	})

	// Translate experience entries
	const experienceKeys = [
		'joinedApplesophy',
		'learningSwift',
		'testflight',
		'released',
		'joinedBoolean',
		'booleanAlumni',
	]

	const translatedExperience: ExperienceType[] = data.experience.map((entry, index) => {
		const key = experienceKeys[index]
		if (key) {
			return {
				...entry,
				title: t(`common.experienceEntries.${key}.title`),
				date: t(`common.experienceEntries.${key}.date`),
				description: t(`common.experienceEntries.${key}.description`),
			}
		}
		return entry
	})

	// Translate about info for Hebrew
	const translatedAbout = locale === 'he' ? {
		...data.about,
		firstName: t('common.about.firstName'),
		lastName: t('common.about.lastName'),
	} : data.about

	return (
		<div class='flex flex-col items-center justify-center overflow-x-hidden'>
			<Hero about={translatedAbout} t={t} />
			<Work projects={translatedProjects} t={t} locale={locale} />
			<Experience experience={translatedExperience} t={t} />
		</div>
	)
})
