# Portfolio

Personal portfolio website built with a Rust/Axum backend and Ilha/Vite frontend, deployed to Fly.io.

## Stack

| Layer | Technology |
|---|---|
| Backend | Rust, Axum, Tokio |
| Frontend | Ilha, Vite, TypeScript, Bun |
| Deployment | Fly.io (Stockholm) |

## Architecture

### Build pipeline

The build is orchestrated by Cargo's `build.rs`, which ties the two halves together at compile time:

1. **Frontend build** — `bun run build` compiles TypeScript and runs the prerenderer, which SSR-renders each page as an HTML fragment and writes them to `frontend/dist/prerendered/`.
2. **Assembly** — `build.rs` reads `data/data.json` and the prerendered fragments, injects them into `base.html`, and writes final HTML files to `frontend/dist/`. The full data object is baked into a `<script id="__DATA__">` tag so pages are instantly usable without a data fetch.
3. **Runtime** — The Axum server serves the pre-assembled HTML files from disk.

This means the production artifact is a single Rust binary plus static files — no Node.js or Bun in the runtime image.

### Hybrid SSR + island hydration

Pages are fully rendered at build time (fast, SEO-friendly). The header and footer are "islands", which means they are SSR'd as HTML but hydrated client-side to support the theme toggle, locale switcher, and scroll-aware behavior. Everything else is inert HTML.

### Bilingual without build variants

All content (English and Norwegian) is embedded in a single HTML file. Locale switching happens entirely client-side via context and `localStorage`, with the browser's `Accept-Language` header as the default. No separate builds, no page reloads.

### Live data

Experience items are pre-rendered at build time from `data.json`. The `GET /api/experience` endpoint enriches them at request time with live download counts fetched from the Zed extension API. This keeps stats current without requiring a full redeploy.

## Project structure

```
portfolio/
├── backend/
│   ├── src/
│   │   ├── main.rs            # Router setup, server entry point
│   │   ├── routes/
│   │   │   ├── pages.rs       # Serves pre-assembled HTML files
│   │   │   └── api.rs         # /api/data, /api/experience (live Zed stats)
│   │   └── types/             # Rust structs + ts-rs type export
│   ├── data/data.json         # Single source of truth for all content
│   ├── base.html              # HTML shell template
│   └── build.rs               # Runs frontend build, assembles final HTML
├── frontend/
│   ├── src/
│   │   ├── pages/             # SSR'd page components (index, projects, experience, contact, error)
│   │   ├── islands/           # Hydrated components (header, footer)
│   │   ├── lib/               # data context, locale, icon helpers
│   │   └── types/             # TypeScript interfaces (generated from Rust via ts-rs)
│   └── vite.config.ts         # Uses @ilha/router for file-based routing
├── Dockerfile                 # Multi-stage: bun → rust → debian runtime
├── fly.toml                   # Fly.io config (region: arn, 256MB, auto-stop)
└── Makefile                   # dev, build, deploy targets
```

## Local development

```sh
make dev      # cargo run (build.rs runs bun build on first run)
make build    # cargo build --release
make deploy   # build + run release binary
```

Set `SKIP_BUN_BUILD=1` to skip the frontend build step during `cargo build` (useful when iterating on backend only).

## Deployment

Deployed via Fly.io. The Dockerfile uses a three-stage build:

1. `oven/bun` — installs dependencies and builds the frontend
2. `rust` — copies the frontend dist, sets `SKIP_BUN_BUILD=1`, compiles the backend
3. `debian:bookworm-slim` — copies the binary and static files, exposes port 8080
