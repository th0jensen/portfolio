import { define } from '~/utils.ts'
import { getBininspectRawAsset } from '~/lib/db/bininspect.ts'

export const handler = define.handlers({
	async GET(ctx) {
		const version =
			new URL(ctx.req.url).searchParams.get('version')?.trim() ||
			undefined
		const artifact = await getBininspectRawAsset('types', version)
		if (!artifact) {
			return new Response('BinInspect types not found.', {
				status: 404,
			})
		}

		return new Response(artifact.text, {
			headers: {
				'Content-Type': 'application/typescript; charset=utf-8',
				'Cache-Control': 'public, max-age=3600',
				'X-Bininspect-Version': artifact.version,
			},
		})
	},
})
