FROM rust:latest AS builder
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
WORKDIR /app
COPY . .
RUN touch .env
RUN make init && make build

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/backend/target/release/backend ./backend
COPY --from=builder /app/backend/static ./static
COPY --from=builder /app/frontend/dist ./frontend/dist
ENV STATIC_DIR=/app/static
ENV DIST_DIR=/app/frontend/dist
ENV RUST_LOG=DEBUG
EXPOSE 8080
CMD ["./backend"]
