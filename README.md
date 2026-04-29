# Portfolio

Personal portfolio website built with a Rust/Axum backend and Ilha/Vite frontend, deployed to Fly.io.

## Stack

| Layer | Technology |
|---|---|
| Backend | Rust, Axum, Tokio |
| RPC | Qubit (type-safe, bindings generated via ts-rs) |
| Email | Resend |
| Frontend | Ilha, Vite, TypeScript, Bun |
| Observability | Prometheus (`/api/metrics`) + Fly.io Grafana |
| Deployment | Fly.io (Stockholm) |

## Architecture

### Build pipeline

The build is orchestrated by Cargo's `build.rs`, which ties the two halves together at compile time:

1. **Frontend build** — `bun run build` compiles TypeScript and runs the prerenderer (`src/prerender.ts`), which SSR-renders each page as an HTML fragment and writes them to `frontend/dist/prerendered/`.
2. **Assembly** — `build.rs` reads `data/data.json` and the prerendered fragments, injects them into `base.html`, and writes final HTML files to `frontend/dist/`.
3. **Runtime** — The Axum server loads the assembled HTML files into memory at startup and serves them from a `PageStore`.

The production artifact is a single Rust binary plus static files — no Node.js or Bun in the runtime image.

### Hybrid SSR + island hydration

Page shells are pre-rendered at build time. On load, islands hydrate and fetch content via Qubit RPC. The header and footer islands handle the theme toggle, locale switcher, and scroll-aware sticky behaviour. Page content (projects, experience, contact) is populated client-side after hydration.

### Bilingual without build variants

All content (English and Norwegian) lives in a single HTML file. Locale switching happens entirely client-side via an Ilha context and `localStorage`, with the browser's `Accept-Language` header as the default. No separate builds, no page reloads.

### Live data

Content is served from `data/data.json` via the `data` RPC handler. The `experience` RPC handler enriches items at request time — fetching live star counts from the GitHub API and download counts from the Zed extension API — then caches results for 3 days. The `lastfm` RPC handler returns the currently playing track.

## Project structure

```
portfolio/
├── backend/
│   ├── src/
│   │   ├── main.rs            # AppState, router setup, server entry point
│   │   ├── routes/
│   │   │   ├── pages.rs       # Serves pre-assembled HTML; POST /contact → mail
│   │   │   ├── api.rs         # Qubit RPC handlers: data, experience, lastfm
│   │   │   ├── assets.rs      # Serves /static and /assets
│   │   │   └── mail.rs        # Resend email dispatch
│   │   └── types/             # Rust structs (ts-rs exports to frontend/src/bindings)
│   ├── data/data.json         # Single source of truth for all content
│   ├── base.html              # HTML shell template (%%HEADER%%, %%APP%%, %%FOOTER%%)
│   └── build.rs               # Runs frontend build, assembles final HTML
├── frontend/
│   ├── src/
│   │   ├── pages/             # Page islands (index, projects, experience, contact, error)
│   │   ├── islands/           # Persistent islands (header, footer)
│   │   ├── lib/               # RPC client, locale context, icon helper
│   │   └── bindings/          # TypeScript types generated from Rust via ts-rs + Qubit
│   └── vite.config.ts         # Uses @ilha/router for file-based routing
├── Dockerfile                 # Two-stage: rust+bun builder → debian runtime
├── fly.toml                   # Fly.io config (region: arn, 256MB, auto-stop)
└── Makefile                   # dev, build, deploy targets
```

## Local development

```sh
make dev      # cargo run with RUST_LOG=DEBUG (build.rs runs bun build automatically)
make build    # cargo build --release
make deploy   # build release binary and run it locally
```

Set `SKIP_BUN_BUILD=1` to skip the frontend build step during `cargo build` (useful when iterating on the backend only).

## Deployment

Deployed to Fly.io via GitHub Actions (`.github/workflows/fly-deploy.yml`). The Dockerfile uses a two-stage build:

1. `rust:latest` — installs Bun, runs `make init && make build` to build both frontend and backend
2. `debian:bookworm-slim` — copies the binary and static files, exposes port 8080
