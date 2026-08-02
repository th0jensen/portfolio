import { pages } from '@ilha/router/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import deno from '@deno/vite-plugin';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'ilha',
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  plugins: [pages({ interceptLinks: false }), tailwindcss(), deno()],
  server: {
    watch: { usePolling: true },
  },
});
