import { pages } from "@ilha/router/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [pages()],
  server: {
    watch: { usePolling: true },
  },
});
