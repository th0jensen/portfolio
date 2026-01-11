import { App, staticFiles, trailingSlashes } from 'fresh'
import { i18nPlugin } from 'fresh-i18n'
import type { ExtendedState } from './utils.ts'

export const app = new App<ExtendedState>()
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
