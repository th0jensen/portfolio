import { App, staticFiles, trailingSlashes } from 'fresh'
import { i18nPlugin } from 'fresh-i18n'
import type { ExtendedState } from './utils.ts'
import { securityHeaders } from '~/lib/security.ts'
import { migrateIfEnabled } from '~/lib/db/migrate.ts'

export const app = new App<ExtendedState>()
	// Add security headers middleware with Trusted Types disabled for Fresh compatibility
	.use(securityHeaders({ enableTrustedTypes: false }))
	// Add static file serving middleware
	.use(staticFiles())
	// Remove trailing slashes from URLs
	.use(trailingSlashes('never'))
	// Add i18n plugin with EN, NO (Norwegian), and HE (Hebrew) support
	.use(i18nPlugin({
		languages: ['en', 'no', 'he'],
		defaultLanguage: 'en',
		localesDir: './locales',
	}))
	// Enable file-system based routing
	.fsRoutes()

await migrateIfEnabled()
