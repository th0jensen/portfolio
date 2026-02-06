import {
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from 'drizzle-orm/pg-core'
import type { CommonLocale } from '../schemas.ts'

export const localeCodeEnum = pgEnum('locale_code', ['en', 'no', 'he'])
export const localeNamespaceEnum = pgEnum('locale_namespace', ['common'])

export const localeTranslations = pgTable('locale_translations', {
	locale: localeCodeEnum('locale').notNull(),
	namespace: localeNamespaceEnum('namespace').notNull().default('common'),
	payload: jsonb('payload').$type<CommonLocale>().notNull(),
	updatedAt: timestamp('updated_at', {
		mode: 'string',
		withTimezone: true,
	}).defaultNow().notNull(),
}, (table) => {
	return {
		localeNamespacePk: primaryKey({
			columns: [table.locale, table.namespace],
			name: 'locale_translations_locale_namespace_pk',
		}),
	}
})

export const assetImages = pgTable('asset_images', {
	key: text('key').primaryKey(),
	mimeType: text('mime_type').notNull(),
	dataBase64: text('data_base64').notNull(),
	updatedAt: timestamp('updated_at', {
		mode: 'string',
		withTimezone: true,
	}).defaultNow().notNull(),
})

export type LocaleCode = typeof localeCodeEnum.enumValues[number]
export type LocaleNamespace = typeof localeNamespaceEnum.enumValues[number]
