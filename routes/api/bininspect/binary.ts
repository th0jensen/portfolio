import { define } from '~/utils.ts'
import { getBininspectRawAsset } from '~/lib/db/bininspect.ts'

export const handler = define.handlers({
	async GET(ctx) {
		const version =
			new URL(ctx.req.url).searchParams.get('version')?.trim() ||
			undefined
		const artifact = await getBininspectRawAsset('binary', version)
		if (!artifact) {
			return new Response('BinInspect binary not found.', {
				status: 404,
			})
		}

		const responseBytes = new Uint8Array(artifact.bytes.byteLength)
		responseBytes.set(artifact.bytes)

		return new Response(
			responseBytes.buffer,
			{
				headers: {
					'Content-Type': 'application/octet-stream',
					'Cache-Control': 'public, max-age=3600',
					'X-Bininspect-Version': artifact.version,
				},
			},
		)
	},
})
