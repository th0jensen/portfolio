/**
 * Build-time pre-rendering script — run with `bun run src/prerender.ts`
 *
 * Renders the header island with hydratable() so the browser can re-attach
 * event listeners without re-rendering from scratch. Page content is handled
 * by @ilha/router client-side.
 *
 * Dynamic import is intentional: header.ts calls getData() at evaluation time,
 * so setData() must be called before the module is imported.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type { Data } from "./types/Data";
import { setData } from "./lib/data";

const rawData = await import("../../backend/data/data.json");
setData(rawData.default as unknown as Data);

const { default: header } = await import("./islands/header");

const outDir = join((import.meta as any).dir, "../dist/prerendered");
mkdirSync(outDir, { recursive: true });

const headerHtml = await header.hydratable({}, { name: "header", as: "div" });
writeFileSync(join(outDir, "header.html"), headerHtml);
console.log("  prerendered: header.html");
