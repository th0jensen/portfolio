import { Button } from '~/components/ui/button.tsx'

interface ExternalLinkProps {
  href: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children: preact.ComponentChildren
  ariaLabel?: string
  openInNewTab?: boolean
}

export default function ExternalLink({
  href,
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ariaLabel,
  openInNewTab = true
}: ExternalLinkProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => globalThis.open(href, openInNewTab ? '_blank' : '_self')}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  )
}