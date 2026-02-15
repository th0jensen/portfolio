import { getImageAsset } from '~/lib/db/images.ts'
import { define } from '~/utils.ts'

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

export const handler = define.handlers({
	async GET(ctx) {
		const imageKey = ctx.params.image
		const imageAsset = await getImageAsset(imageKey)

		if (!imageAsset) {
			return new Response('Image not found', { status: 404 })
		}

		const imageBytes = base64ToBytes(imageAsset.dataBase64)
		const responseBytes = new Uint8Array(imageBytes.byteLength)
		responseBytes.set(imageBytes)

		return new Response(responseBytes.buffer, {
			headers: {
				'Content-Type': imageAsset.mimeType,
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		})
	},
})
