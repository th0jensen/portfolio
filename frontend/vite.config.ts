import { pages } from '@ilha/router/vite';
import tailwindcss from '@tailwindcss/vite';
import { createLogger, defineConfig } from 'vite';

const logger = createLogger();
const isRuntimeFontWarning = (message: string) =>
    /\/static\/fonts\/alef-(400|700)\.ttf referenced/.test(message);
const warn = logger.warn.bind(logger);
const warnOnce = logger.warnOnce.bind(logger);
logger.warn = (message, options) => {
    if (!isRuntimeFontWarning(message)) warn(message, options);
};
logger.warnOnce = (message, options) => {
    if (!isRuntimeFontWarning(message)) warnOnce(message, options);
};

export default defineConfig({
    oxc: {
        jsx: {
            runtime: 'automatic',
            importSource: 'ilha',
        },
    },
    customLogger: logger,
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
