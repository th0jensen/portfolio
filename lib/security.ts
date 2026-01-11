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
	cspReportOnly: false, // Set to true to test CSP without breaking the site
	hstsMaxAge: 31536000, // 1 year
	hstsIncludeSubdomains: true,
	hstsPreload: true,
	additionalCSPDirectives: {},
}

/**
 * Build Content Security Policy header value
 */
function buildCSP(
	additionalDirectives: Record<string, string[]> = {},
): string {
	const directives: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'",
			"'unsafe-inline'", // Required for inline scripts (theme detection)
			'https://fonts.googleapis.com',
		],
		'style-src': [
			"'self'",
			"'unsafe-inline'", // Required for Tailwind and inline styles
			'https://fonts.googleapis.com',
		],
		'img-src': [
			"'self'",
			'data:',
			'https:',
			'blob:',
		],
		'font-src': [
			"'self'",
			'https://fonts.gstatic.com',
		],
		'connect-src': [
			"'self'",
			'https://api.github.com',
		],
		'frame-ancestors': ["'none'"], // Prevents clickjacking
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'object-src': ["'none'"],
		'upgrade-insecure-requests': [],
		// Note: Trusted Types disabled as it can break inline scripts
		// Enable with nonce-based CSP for stricter security:
		// 'require-trusted-types-for': ["'script'"],
		// 'trusted-types': ['default'],
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
			buildCSP(mergedConfig.additionalCSPDirectives),
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
		ctx: { next: () => Promise<Response> },
	): Promise<Response> {
		const response = await ctx.next()
		return applySecurityHeaders(response, config)
	}
}
