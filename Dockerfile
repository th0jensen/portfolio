FROM rust:1.95.0-bookworm AS just-builder
RUN cargo install just --version 1.57.0 --locked

FROM denoland/deno:2.9.4 AS frontend-builder
USER root
COPY --from=just-builder /usr/local/cargo/bin/just /usr/local/bin/just
WORKDIR /app/frontend

COPY frontend/deno.json frontend/deno.lock frontend/justfile ./
RUN just init

COPY frontend/ ./
RUN just build \
    && mkdir -p /output \
    && mv dist/renderer /output/renderer

FROM rust:1.95.0-bookworm AS backend-builder
COPY --from=just-builder /usr/local/cargo/bin/just /usr/local/bin/just
WORKDIR /app/backend

COPY backend/Cargo.toml backend/Cargo.lock backend/justfile ./
RUN mkdir src \
    && printf 'fn main() {}\n' > src/main.rs \
    && just build \
    && rm -rf src

COPY backend/src ./src
COPY backend/data ./data
RUN touch src/main.rs \
    && just build \
    && cp target/release/portfolio-backend /portfolio-backend

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home portfolio

WORKDIR /app
COPY --from=backend-builder /portfolio-backend ./backend
COPY --from=frontend-builder /output/renderer ./renderer
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY backend/static ./static

ENV STATIC_DIR=/app/static
ENV DIST_DIR=/app/frontend/dist
ENV RENDERER_BIN=/app/renderer
ENV AXUM_ORIGIN=http://127.0.0.1:8080
ENV RUST_LOG=INFO

USER portfolio
EXPOSE 8080
CMD ["./backend"]
