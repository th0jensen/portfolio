FROM oven/bun:latest AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install
COPY frontend/ .
COPY backend/data /app/backend/data
RUN bunx vite build && bun run src/prerender.ts

FROM rust:latest AS backend
WORKDIR /app/backend
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/build.rs ./
COPY backend/base.html ./
COPY backend/src ./src
COPY backend/data ./data
COPY backend/static ./static
# Give build.rs the frontend dist so it can assemble per-route HTML files.
COPY --from=frontend /app/frontend/dist ./frontend_dist
ENV DIST_DIR=./frontend_dist
ENV SKIP_BUN_BUILD=1
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/backend/target/release/backend ./backend
COPY --from=backend /app/backend/static ./static
# Assembled HTML + assets come from the backend stage (build.rs wrote into dist).
COPY --from=backend /app/backend/frontend_dist ./frontend/dist
ENV STATIC_DIR=/app/static
ENV DIST_DIR=/app/frontend/dist
ENV RUST_LOG=info
EXPOSE 8080
CMD ["./backend"]
