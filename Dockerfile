FROM rust:latest AS builder
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:$PATH"
WORKDIR /app
COPY . .
RUN touch .env

RUN cargo install just
RUN just init
RUN just build

FROM ubuntu:24.04 AS runtime
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/backend/target/release/portfolio-backend ./backend
COPY --from=builder /app/backend/static ./static
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/frontend/dist/renderer ./renderer
ENV STATIC_DIR=/app/static
ENV DIST_DIR=/app/frontend/dist
ENV RENDERER_BIN=/app/renderer
ENV AXUM_ORIGIN=http://127.0.0.1:8080
ENV RUST_LOG=DEBUG
EXPOSE 8080
CMD ["./backend"]
