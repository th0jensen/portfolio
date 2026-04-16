FROM oven/bun:latest AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install
COPY frontend/ .
RUN bun run build

FROM rust:latest AS backend
WORKDIR /app/backend
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY backend/data ./data
COPY backend/static ./static
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=backend /app/backend/target/release/backend ./backend
COPY --from=backend /app/backend/static ./static
COPY --from=frontend /app/frontend/dist ./frontend/dist
EXPOSE 8080
CMD ["./backend"]
