import { define } from '~/utils.ts'

export const handler = define.handlers({
	GET() {
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/en',
				Link: [
					'<https://fonts.googleapis.com>; rel=preconnect',
					'<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
					'<https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap>; rel=preload; as=style',
				].join(', '),
			},
		})
	},
})
