import { define } from '~/utils.ts'
import { getLivePortfolioRepos } from '~/lib/page_data.ts'

export const handler = define.handlers({
	async GET() {
		const repos = await getLivePortfolioRepos()
		return Response.json(repos, {
			headers: {
				'Cache-Control':
					'public, max-age=300, stale-while-revalidate=900',
			},
		})
	},
})
