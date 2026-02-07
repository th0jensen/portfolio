import { type JSX } from 'preact'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '~/lib/utils.ts'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
                outline:
                    'border border-border/50 bg-background hover:bg-accent/50 hover:text-accent-foreground shadow-sm',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                ghost: 'hover:bg-accent/60 hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-5 py-2',
                sm: 'h-9 rounded-lg px-3.5',
                lg: 'h-12 rounded-xl px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

export interface ButtonProps
    extends
        JSX.HTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    type?: 'button' | 'submit' | 'reset'
}

export interface LinkProps
    extends
        JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    href?: string
}

function Button(
    { className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps,
) {
    const Comp = asChild ? Slot : 'button'
    return (
        <Comp
            type={type}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

function Link(
    { className, variant, size, asChild = false, href = '#', ...props }: LinkProps,
) {
    const Comp = asChild ? Slot : 'a'
    return (
        <Comp
            href={href}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, Link, buttonVariants }
