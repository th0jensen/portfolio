import { define } from '~/utils.ts'
import {
	base64ToText,
	bininspectUploadSchema,
	getBininspectArtifact,
	upsertBininspectArtifact,
} from '~/lib/db/bininspect.ts'

function getApiToken(request: Request): string | null {
	const authorization = request.headers.get('authorization')
	if (authorization && authorization.startsWith('Bearer ')) {
		return authorization.slice('Bearer '.length).trim()
	}
	const apiKeyHeader = request.headers.get('x-api-key')
	return apiKeyHeader?.trim() || null
}

function getRequestedVersion(request: Request): string | undefined {
	const version = new URL(request.url).searchParams.get('version')
	if (!version) {
		return undefined
	}
	const trimmedVersion = version.trim()
	return trimmedVersion.length > 0 ? trimmedVersion : undefined
}

export const handler = define.handlers({
	async GET(ctx) {
		const version = getRequestedVersion(ctx.req)
		const artifact = await getBininspectArtifact(version)
		if (!artifact) {
			return new Response('BinInspect artifact not found.', {
				status: 404,
			})
		}

		return Response.json({
			version: artifact.version,
			endpoints: {
				wasm: '/api/bininspect/wasm',
				internal: '/api/bininspect/internal',
				types: '/api/bininspect/types',
				binary: '/api/bininspect/binary',
			},
		})
	},
	async POST(ctx) {
		const serverApiKey = Deno.env.get('API_KEY')
		if (!serverApiKey) {
			return new Response('API_KEY is not configured on the server.', {
				status: 500,
			})
		}

		const requestApiKey = getApiToken(ctx.req)
		if (!requestApiKey || requestApiKey !== serverApiKey) {
			return new Response('Unauthorized', { status: 401 })
		}

		const body = await ctx.req.json()
		const parsedUpload = bininspectUploadSchema.safeParse(body)

		if (!parsedUpload.success) {
			return new Response('Invalid upload payload.', { status: 400 })
		}

		const { version, types, internal, wasm, binary } = parsedUpload.data

		await upsertBininspectArtifact({
			version: version.trim(),
			types: base64ToText(types.data),
			internal: base64ToText(internal.data),
			wasm: wasm.data,
			binary: binary.data,
		})

		return Response.json({
			ok: true,
			version: version.trim(),
		})
	},
})
