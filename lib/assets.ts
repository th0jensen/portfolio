const API_ROUTE_PREFIX = '/api/'

export function toApiAssetUrl(path: string): string {
	if (!path) {
		return path
	}

	if (/^https?:\/\//.test(path) || path.startsWith(API_ROUTE_PREFIX)) {
		return path
	}

	const normalizedPath = path.startsWith('/') ? path.slice(1) : path
	return `/api/assets/${normalizedPath}`
}
