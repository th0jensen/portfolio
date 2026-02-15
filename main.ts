import { App, staticFiles, trailingSlashes } from 'fresh'
import type { ExtendedState } from './utils.ts'
import { securityHeaders } from '~/lib/security.ts'

export const app = new App<ExtendedState>()
	// Expose the request origin for resource-hint links in the app shell.
	.use(async (ctx) => {
		const url = new URL(ctx.req.url)
		ctx.state.assetOrigin = url.origin
		ctx.state.requestPath = url.pathname
		return await ctx.next()
	})
	// Add security headers middleware with Trusted Types disabled for Fresh compatibility
	.use(securityHeaders({ enableTrustedTypes: false, enableCSP: false }))
	// Add static file serving middleware
	.use(staticFiles())
	// Remove trailing slashes from URLs
	.use(trailingSlashes('never'))
	// Enable file-system based routing
	.fsRoutes()
