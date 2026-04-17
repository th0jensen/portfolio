/**
 * Build-time SSR fragment script — invoked by build.rs via `bun run build`.
 *
 * Outputs raw ilha SSR fragments to dist/prerendered/.
 * Shell construction, data slicing, and __DATA__ injection are handled by
 * build.rs so that logic lives entirely on the Rust side.
 *
 * Dynamic imports are intentional: the header calls getData() at evaluation
 * time, so setData() must be called before any island module is imported.
 */
import Bun from "bun";
import type { Data } from "./types/Data";
import { setData, dataSignal } from "./lib/data";

const rawData = await import("../../backend/data/data.json");
setData(rawData.default as unknown as Data);
const data = rawData.default as unknown as Data;

const { default: header } = await import("./islands/header");
const { default: footer } = await import("./islands/footer");
const { pageRouter, registry } = await import("../.ilha/routes");

const distDir = `${import.meta.dir}/../dist`;
await Bun.$`mkdir -p ${distDir}/prerendered`;

// Header with hydration markers — Rust injects this into the page shell.
const headerHtml = await header.hydratable({}, { name: "header", as: "div" });
await Bun.write(`${distDir}/prerendered/header.html`, headerHtml);
console.log("  fragment: header.html");

// Footer island — year is computed client-side after hydration.
const footerHtml = await footer.hydratable({}, { name: "footer", as: "div" });
await Bun.write(`${distDir}/prerendered/footer.html`, footerHtml);
console.log("  fragment: footer.html");

// Page SSR fragments — Rust wraps these with the HTML shell and per-route
// __DATA__. Full data is used here so every island renders correctly;
// Rust handles slicing what actually goes into each page's __DATA__.
dataSignal(data);

const routes = [
  { url: "/", name: "index" },
  { url: "/projects", name: "projects" },
  { url: "/experience", name: "experience" },
  { url: "/contact", name: "contact" },
  { url: "/error", name: "error" },
];

for (const route of routes) {
  const appHtml = await pageRouter.renderHydratable(route.url, registry);
  await Bun.write(`${distDir}/prerendered/${route.name}.html`, appHtml);
  console.log(`  fragment: ${route.name}.html`);
}
