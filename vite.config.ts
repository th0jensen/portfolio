import { defineConfig } from 'vite'
import { fresh } from 'jsr:@fresh/plugin-vite@1.0.8'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'npm:autoprefixer@10.4.20'

export default defineConfig({
	plugins: [
		fresh(),
	],
	resolve: {
		alias: {
			'pg-protocol': 'pg-protocol/dist/index.js',
		},
	},
	ssr: {
		external: ['pg', 'drizzle-orm/node-postgres', 'pg-protocol'],
	},
	css: {
		postcss: {
			plugins: [
				tailwindcss(),
				autoprefixer(),
			],
		},
	},
})
