interface FooterProps {
	t: (key: string) => string
}

export default function Footer({ t }: FooterProps) {
	const year = new Date().getFullYear()
	const copyrightText = t('common.metadata.footerText').replace(
		'{year}',
		year.toString(),
	)

	return (
		<footer class='footer text-center justify-center py-8 px-4 border-t border-border/20'>
			<p class='font-medium text-sm text-muted-foreground'>
				© {copyrightText}
			</p>
		</footer>
	)
}
