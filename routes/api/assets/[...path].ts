import { define } from '~/utils.ts'

const STATIC_ROOT = new URL('../../../static/', import.meta.url)

function getMimeType(path: string): string {
	const normalizedPath = path.toLowerCase()

	if (normalizedPath.endsWith('.pdf')) return 'application/pdf'
	if (normalizedPath.endsWith('.svg')) return 'image/svg+xml'
	if (normalizedPath.endsWith('.webp')) return 'image/webp'
	if (normalizedPath.endsWith('.jpg') || normalizedPath.endsWith('.jpeg')) {
		return 'image/jpeg'
	}
	if (normalizedPath.endsWith('.png')) return 'image/png'
	if (normalizedPath.endsWith('.gif')) return 'image/gif'
	if (normalizedPath.endsWith('.ttf')) return 'font/ttf'
	if (normalizedPath.endsWith('.otf')) return 'font/otf'
	if (normalizedPath.endsWith('.woff')) return 'font/woff'
	if (normalizedPath.endsWith('.woff2')) return 'font/woff2'
	if (normalizedPath.endsWith('.wasm')) return 'application/wasm'

	return 'application/octet-stream'
}

function isImmutableAsset(path: string): boolean {
	const normalizedPath = path.toLowerCase()
	return [
		'.svg',
		'.webp',
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.ttf',
		'.otf',
		'.woff',
		'.woff2',
		'.wasm',
	].some((extension) => normalizedPath.endsWith(extension))
}

export const handler = define.handlers({
	async GET(ctx) {
		const assetPath = ctx.params.path?.trim()

		if (!assetPath || assetPath.includes('..')) {
			return new Response('Invalid asset path.', { status: 400 })
		}

		const fileUrl = new URL(assetPath, STATIC_ROOT)
		if (!fileUrl.pathname.startsWith(STATIC_ROOT.pathname)) {
			return new Response('Invalid asset path.', { status: 400 })
		}

		try {
			const assetBytes = await Deno.readFile(fileUrl)
			return new Response(assetBytes, {
				headers: {
					'Content-Type': getMimeType(assetPath),
					'Cache-Control': isImmutableAsset(assetPath)
						? 'public, max-age=31536000, immutable'
						: 'public, max-age=3600',
				},
			})
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) {
				return new Response('Asset not found.', { status: 404 })
			}

			throw error
		}
	},
})
