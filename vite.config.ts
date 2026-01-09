import { defineConfig } from 'vite'
import { fresh } from 'jsr:@fresh/plugin-vite'
import tailwindcss from 'npm:tailwindcss@3.4.1'
import autoprefixer from 'npm:autoprefixer@10.4.20'

export default defineConfig({
	plugins: [
		fresh(),
	],
	css: {
		postcss: {
			plugins: [
				tailwindcss(),
				autoprefixer(),
			],
		},
	},
})
