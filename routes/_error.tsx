import { HttpError, PageProps } from 'fresh'

export default function ErrorPage(props: PageProps) {
	const error = props.error

	if (error instanceof HttpError) {
		const status = error.status

		if (status === 404) {
			return (
				<div class='flex flex-col items-center justify-center min-h-[50vh] p-4'>
					<h1 class='text-4xl font-bold mb-4'>404</h1>
					<p class='text-muted-foreground'>
						The page you're looking for doesn't exist.
					</p>
				</div>
			)
		}

		return (
			<div class='flex flex-col items-center justify-center min-h-[50vh] p-4'>
				<h1 class='text-4xl font-bold mb-4'>Error {status}</h1>
				<p class='text-muted-foreground'>
					{error.message || 'An error occurred'}
				</p>
			</div>
		)
	}

	const errorMessage = error instanceof Error ? error.message : String(error)

	return (
		<div class='flex flex-col items-center justify-center min-h-[50vh] p-4'>
			<h1 class='text-4xl font-bold mb-4'>Something went wrong</h1>
			<p class='text-muted-foreground mb-4'>
				An unexpected error occurred
			</p>
			{errorMessage && (
				<p class='font-mono text-sm text-muted-foreground'>
					{errorMessage}
				</p>
			)}
		</div>
	)
}
