import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from 'drizzle-orm/pg-core'
import type { Project } from '../schemas.ts'

export const localeCodeEnum = pgEnum('locale_code', ['en', 'no', 'he'])

function withUpdatedAt() {
	return timestamp('updated_at', {
		mode: 'string',
		withTimezone: true,
	}).defaultNow().notNull()
}

export const localeMetadata = pgTable('locale_metadata', {
	locale: localeCodeEnum('locale').primaryKey(),
	name: text('name').notNull(),
	altName: text('alt_name').notNull(),
	description: text('description').notNull(),
	footerText: text('footer_text').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeMeta = pgTable('locale_meta', {
	locale: localeCodeEnum('locale').primaryKey(),
	description: text('description').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeNav = pgTable('locale_nav', {
	locale: localeCodeEnum('locale').primaryKey(),
	work: text('work').notNull(),
	experience: text('experience').notNull(),
	contact: text('contact').notNull(),
	openMenu: text('open_menu').notNull(),
	closeMenu: text('close_menu').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeAbout = pgTable('locale_about', {
	locale: localeCodeEnum('locale').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	birthday: text('birthday').notNull(),
	humanLanguages: jsonb('human_languages').$type<string[]>().notNull(),
	computerLanguages: jsonb('computer_languages').$type<string[]>().notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeHero = pgTable('locale_hero', {
	locale: localeCodeEnum('locale').primaryKey(),
	role: text('role').notNull(),
	description: text('description').notNull(),
	exploreWork: text('explore_work').notNull(),
	github: text('github').notNull(),
	linkedin: text('linkedin').notNull(),
	headshotAlt: text('headshot_alt').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeWork = pgTable('locale_work', {
	locale: localeCodeEnum('locale').primaryKey(),
	subtitle: text('subtitle').notNull(),
	title: text('title').notNull(),
	showMore: text('show_more').notNull(),
	showLess: text('show_less').notNull(),
	visitProject: text('visit_project').notNull(),
	downloadAppStore: text('download_app_store').notNull(),
	viewOnGitHub: text('view_on_github').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeProjects = pgTable('locale_projects', {
	locale: localeCodeEnum('locale').notNull(),
	projectIndex: integer('project_index').notNull(),
	name: text('name').notNull(),
	status: text('status'),
	imageUrl: text('image_url').notNull(),
	technologies: jsonb('technologies')
		.$type<Project['technologies']>()
		.notNull(),
	description: text('description').notNull(),
	sourceType: text('source_type'),
	sourceLink: text('source_link'),
	updatedAt: withUpdatedAt(),
}, (table) => {
	return {
		localeProjectPk: primaryKey({
			columns: [table.locale, table.projectIndex],
			name: 'locale_projects_locale_project_index_pk',
		}),
	}
})

export const localeExperience = pgTable('locale_experience', {
	locale: localeCodeEnum('locale').primaryKey(),
	subtitle: text('subtitle').notNull(),
	title: text('title').notNull(),
	description: text('description').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeTheme = pgTable('locale_theme', {
	locale: localeCodeEnum('locale').primaryKey(),
	light: text('light').notNull(),
	dark: text('dark').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeFooter = pgTable('locale_footer', {
	locale: localeCodeEnum('locale').primaryKey(),
	copyright: text('copyright').notNull(),
	updatedAt: withUpdatedAt(),
})

export const localeButtons = pgTable('locale_buttons', {
	locale: localeCodeEnum('locale').primaryKey(),
	github: text('github').notNull(),
	linkedin: text('linkedin').notNull(),
	updatedAt: withUpdatedAt(),
})

export const assetImages = pgTable('asset_images', {
	key: text('key').primaryKey(),
	mimeType: text('mime_type').notNull(),
	dataBase64: text('data_base64').notNull(),
	updatedAt: withUpdatedAt(),
})

export type LocaleCode = typeof localeCodeEnum.enumValues[number]
