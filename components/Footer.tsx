export default function Footer() {
  const date = new Date().getFullYear()

	return (
		<footer class='footer text-center justify-center p-4'>
			<p class='font-medium text-sm'>
				{`© ${date} Thomas Jensen`}
			</p>
		</footer>
	)
}
