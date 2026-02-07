import { App, staticFiles, trailingSlashes } from 'fresh'
import { options } from 'preact'
import type { ExtendedState } from './utils.ts'
import { securityHeaders } from '~/lib/security.ts'

const originalVNodeHook = options.vnode
options.vnode = (vnode) => {
	if (typeof vnode.type === 'string' && vnode.type === 'link') {
		const props = vnode.props as Record<string, unknown>
		const href = typeof props.href === 'string' ? props.href : ''
		if (
			props.rel === 'stylesheet' &&
			href.startsWith('/assets/') &&
			href.includes('.css')
		) {
			props.media = 'print'
			props.onload = "this.media='all'"
		}
	}

	originalVNodeHook?.(vnode)
}

export const app = new App<ExtendedState>()
	// Expose the request origin for resource-hint links in the app shell.
	.use(async (ctx) => {
		ctx.state.assetOrigin = new URL(ctx.req.url).origin
		return await ctx.next()
	})
	// Add security headers middleware with Trusted Types disabled for Fresh compatibility
	.use(securityHeaders({ enableTrustedTypes: false }))
	// Add static file serving middleware
	.use(staticFiles())
	// Remove trailing slashes from URLs
	.use(trailingSlashes('never'))
	// Enable file-system based routing
	.fsRoutes()
