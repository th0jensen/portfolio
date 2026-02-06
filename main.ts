import { App, staticFiles, trailingSlashes } from 'fresh'
import type { ExtendedState } from './utils.ts'
import { securityHeaders } from '~/lib/security.ts'

export const app = new App<ExtendedState>()
	// Add security headers middleware with Trusted Types disabled for Fresh compatibility
	.use(securityHeaders({ enableTrustedTypes: false }))
	// Add static file serving middleware
	.use(staticFiles())
	// Remove trailing slashes from URLs
	.use(trailingSlashes('never'))
	// Enable file-system based routing
	.fsRoutes()
