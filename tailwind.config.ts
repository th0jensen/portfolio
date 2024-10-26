import { type Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
    content: [
        '{routes,islands,components}/**/*.{ts,tsx,js,jsx}',
    ],
    // deno-lint-ignore no-explicit-any
    plugins: [daisyui as any],
    daisyui: {
        themes: ['light', 'dark'],
        darkTheme: 'dark',
        logs: false,
    },
} satisfies Config
