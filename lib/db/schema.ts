import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export const localizedContent = pgTable('localized_content', {
	locale: text('locale').primaryKey(),
	content: jsonb('content').notNull(),
})
