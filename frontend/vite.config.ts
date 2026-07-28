import { pages } from '@ilha/router/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

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
                codeSplitting: {
                    maxSize: 400_000,
                    groups: [{
                        name: 'vendor',
                        test: /node_modules/,
                        priority: 10,
                    }],
                },
                entryFileNames: 'assets/index-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
    },
    plugins: [pages({ interceptLinks: false }), tailwindcss()],
    server: {
        watch: { usePolling: true },
    },
});
