import { Context } from 'fresh'
import { ExtendedState } from '../utils.ts'

export interface SecurityHeadersConfig {
	enableCSP?: boolean
	enableHSTS?: boolean
	enableCORS?: boolean
	cspReportOnly?: boolean
	hstsMaxAge?: number
}

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
	enableCSP: true,
	enableHSTS: true,
	enableCORS: true,
	cspReportOnly: false,
	hstsMaxAge: 31536000,
}

export function generateNonce(): string {
	const array = new Uint8Array(16)
	crypto.getRandomValues(array)
	return btoa(String.fromCharCode(...array))
}

function buildCSP(): string {
	const directives: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'",
			"'unsafe-inline'",
			"'unsafe-eval'",
			'fresh-island:',
			'data:',
		],
		'script-src-elem': [
			"'self'",
			"'unsafe-inline'",
			"'unsafe-eval'",
			'fresh-island:',
			'data:',
		],
		'style-src': ["'self'", "'unsafe-inline'"],
		'img-src': ["'self'", 'data:', 'blob:', 'https:'],
		'font-src': ["'self'", 'data:'],
		'connect-src': ["'self'"],
		'frame-ancestors': ["'self'"],
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'object-src': ["'none'"],
	}

	return Object.entries(directives)
		.map(([directive, values]) => `${directive} ${values.join(' ')}`)
		.join('; ')
}

function setCorsHeaders(
	headers: Headers,
	req: Request,
	requestOrigin: string,
): Response | null {
	const origin = req.headers.get('origin')
	if (!origin) {
		return null
	}

	if (origin !== requestOrigin) {
		return null
	}

	headers.set('Access-Control-Allow-Origin', origin)
	headers.set('Access-Control-Allow-Credentials', 'true')
	headers.set('Vary', 'Origin')

	if (req.method === 'OPTIONS') {
		headers.set(
			'Access-Control-Allow-Methods',
			'GET, POST, PUT, PATCH, DELETE, OPTIONS',
		)

		const requestedHeaders = req.headers.get('access-control-request-headers')
		headers.set(
			'Access-Control-Allow-Headers',
			requestedHeaders ?? 'Content-Type, Authorization, X-Requested-With',
		)
		headers.set('Access-Control-Max-Age', '86400')

		return new Response(null, { status: 204, headers })
	}

	return null
}

export function applySecurityHeaders(
	response: Response,
	req: Request,
	config: SecurityHeadersConfig = {},
): Response {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config }
	const requestOrigin = new URL(req.url).origin
	const headers = new Headers(response.headers)

	if (mergedConfig.enableCSP) {
		const cspHeaderName = mergedConfig.cspReportOnly
			? 'Content-Security-Policy-Report-Only'
			: 'Content-Security-Policy'
		headers.set(cspHeaderName, buildCSP())
	}

	if (mergedConfig.enableHSTS && requestOrigin.startsWith('https://')) {
		headers.set(
			'Strict-Transport-Security',
			`max-age=${mergedConfig.hstsMaxAge}; includeSubDomains; preload`,
		)
	}

	headers.set('X-Content-Type-Options', 'nosniff')
	headers.set('X-Frame-Options', 'SAMEORIGIN')
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	headers.set('Cross-Origin-Opener-Policy', 'same-origin')
	headers.set('Cross-Origin-Resource-Policy', 'same-origin')
	headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=()',
	)

	if (mergedConfig.enableCORS) {
		setCorsHeaders(headers, req, requestOrigin)
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

export function securityHeaders(config: SecurityHeadersConfig = {}) {
	return async function securityMiddleware(
		ctx: Context<ExtendedState>,
	): Promise<Response> {
		ctx.state.cspNonce = generateNonce()
		const requestOrigin = new URL(ctx.req.url).origin

		if (config.enableCORS ?? DEFAULT_CONFIG.enableCORS) {
			const preflightHeaders = new Headers()
			const preflight = setCorsHeaders(preflightHeaders, ctx.req, requestOrigin)
			if (preflight) {
				return preflight
			}
		}

		const response = await ctx.next()
		return applySecurityHeaders(response, ctx.req, config)
	}
}
