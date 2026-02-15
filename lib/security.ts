import { Context } from 'fresh'
import { ExtendedState } from '../utils.ts'

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
	/** Enable Content Security Policy */
	enableCSP?: boolean
	/** Enable HTTP Strict Transport Security */
	enableHSTS?: boolean
	/** Enable Cross-Origin-Opener-Policy */
	enableCOOP?: boolean
	/** Enable Cross-Origin-Embedder-Policy */
	enableCOEP?: boolean
	/** Enable Cross-Origin-Resource-Policy */
	enableCORP?: boolean
	/** Enable X-Frame-Options */
	enableXFrameOptions?: boolean
	/** Use CSP in report-only mode (for testing) */
	cspReportOnly?: boolean
	/** Enable X-Content-Type-Options */
	enableXContentTypeOptions?: boolean
	/** Enable Referrer-Policy */
	enableReferrerPolicy?: boolean
	/** Enable Permissions-Policy */
	enablePermissionsPolicy?: boolean
	/** Enable Trusted Types */
	enableTrustedTypes?: boolean
	/** HSTS max-age in seconds (default: 1 year) */
	hstsMaxAge?: number
	/** Include subdomains in HSTS */
	hstsIncludeSubdomains?: boolean
	/** Add preload directive to HSTS */
	hstsPreload?: boolean
	/** Additional CSP directives to merge */
	additionalCSPDirectives?: Record<string, string[]>
}

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
	enableCSP: true,
	enableHSTS: true,
	enableCOOP: true,
	enableCOEP: false, // Can break third-party integrations
	enableCORP: true,
	enableXFrameOptions: true,
	enableXContentTypeOptions: true,
	enableReferrerPolicy: true,
	enablePermissionsPolicy: true,
	enableTrustedTypes: true,
	cspReportOnly: false, // Set to true to test CSP without breaking the site
	hstsMaxAge: 31536000, // 1 year
	hstsIncludeSubdomains: true,
	hstsPreload: true,
	additionalCSPDirectives: {},
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
	const array = new Uint8Array(16)
	crypto.getRandomValues(array)
	return btoa(String.fromCharCode(...array))
}

/**
 * Build Content Security Policy header value
 */
function buildCSP(
	additionalDirectives: Record<string, string[]> = {},
	_nonce?: string,
	enableTrustedTypes = true,
): string {
	const directives: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'",
			"'unsafe-inline'",
			"'unsafe-eval'",
			'data:',
			'fresh-island:',
			'blob:',
		],
		'script-src-elem': [
			"'self'",
			"'unsafe-inline'",
			"'unsafe-eval'",
			'data:',
			'fresh-island:',
			'blob:',
		],
		'style-src': [
			"'self'",
			"'unsafe-inline'", // Required for Tailwind and inline styles
		],
		'img-src': [
			"'self'",
			'data:',
			'https:',
			'blob:',
		],
		'font-src': [
			"'self'",
			'https://r2cdn.perplexity.ai',
		],
		'connect-src': [
			"'self'",
			'https://api.github.com',
			'https://github.com',
			'https://raw.githubusercontent.com',
			'https://objects.githubusercontent.com',
			'https://*.githubusercontent.com',
		],
		'frame-ancestors': ["'none'"], // Prevents clickjacking
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'object-src': ["'none'"],
		'upgrade-insecure-requests': [],
	}

	// Add Trusted Types directives if enabled
	if (enableTrustedTypes) {
		directives['require-trusted-types-for'] = ["'script'"]
		directives['trusted-types'] = ['default']
	}

	// Merge additional directives
	for (const [directive, values] of Object.entries(additionalDirectives)) {
		if (directives[directive]) {
			directives[directive] = [
				...new Set([...directives[directive], ...values]),
			]
		} else {
			directives[directive] = values
		}
	}

	return Object.entries(directives)
		.map(([directive, values]) => {
			if (values.length === 0) {
				return directive
			}
			return `${directive} ${values.join(' ')}`
		})
		.join('; ')
}

/**
 * Build HSTS header value
 */
function buildHSTS(
	maxAge: number,
	includeSubdomains: boolean,
	preload: boolean,
): string {
	let value = `max-age=${maxAge}`
	if (includeSubdomains) {
		value += '; includeSubDomains'
	}
	if (preload) {
		value += '; preload'
	}
	return value
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicy(): string {
	const policies = [
		'accelerometer=()',
		'autoplay=()',
		'camera=()',
		'cross-origin-isolated=()',
		'display-capture=()',
		'encrypted-media=()',
		'fullscreen=(self)',
		'geolocation=()',
		'gyroscope=()',
		'keyboard-map=()',
		'magnetometer=()',
		'microphone=()',
		'midi=()',
		'payment=()',
		'picture-in-picture=()',
		'publickey-credentials-get=()',
		'screen-wake-lock=()',
		'sync-xhr=()',
		'usb=()',
		'xr-spatial-tracking=()',
	]
	return policies.join(', ')
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
	response: Response,
	config: SecurityHeadersConfig = {},
	nonce?: string,
): Response {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config }
	const headers = new Headers(response.headers)

	// Content Security Policy
	if (mergedConfig.enableCSP) {
		const cspHeaderName = mergedConfig.cspReportOnly
			? 'Content-Security-Policy-Report-Only'
			: 'Content-Security-Policy'
		headers.set(
			cspHeaderName,
			buildCSP(
				mergedConfig.additionalCSPDirectives,
				nonce,
				mergedConfig.enableTrustedTypes,
			),
		)
	}

	// HTTP Strict Transport Security
	if (mergedConfig.enableHSTS) {
		headers.set(
			'Strict-Transport-Security',
			buildHSTS(
				mergedConfig.hstsMaxAge,
				mergedConfig.hstsIncludeSubdomains,
				mergedConfig.hstsPreload,
			),
		)
	}

	// Cross-Origin-Opener-Policy
	if (mergedConfig.enableCOOP) {
		headers.set('Cross-Origin-Opener-Policy', 'same-origin')
	}

	// Cross-Origin-Embedder-Policy
	if (mergedConfig.enableCOEP) {
		headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
	}

	// Cross-Origin-Resource-Policy
	if (mergedConfig.enableCORP) {
		headers.set('Cross-Origin-Resource-Policy', 'same-origin')
	}

	// X-Frame-Options (legacy, but still useful)
	if (mergedConfig.enableXFrameOptions) {
		headers.set('X-Frame-Options', 'DENY')
	}

	// X-Content-Type-Options
	if (mergedConfig.enableXContentTypeOptions) {
		headers.set('X-Content-Type-Options', 'nosniff')
	}

	// Referrer-Policy
	if (mergedConfig.enableReferrerPolicy) {
		headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	}

	// Permissions-Policy
	if (mergedConfig.enablePermissionsPolicy) {
		headers.set('Permissions-Policy', buildPermissionsPolicy())
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

/**
 * Security headers middleware for Fresh
 */
export function securityHeaders(config: SecurityHeadersConfig = {}) {
	return async function securityMiddleware(
		ctx: Context<ExtendedState>,
	): Promise<Response> {
		// Generate a unique nonce for this request
		const nonce = generateNonce()
		// Store nonce in context state so it's available in page components
		ctx.state.cspNonce = nonce

		const response = await ctx.next()
		return applySecurityHeaders(response, config, nonce)
	}
}
