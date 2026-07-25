FROM debian:bookworm-slim AS wasm-builder
RUN apt-get update && apt-get install -y \
    curl git ca-certificates build-essential libnuma-dev libgmp-dev wabt jq unzip zstd \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://gitlab.haskell.org/haskell-wasm/ghc-wasm-meta/-/raw/master/bootstrap.sh | FLAVOUR=9.14 bash
ENV PATH="/root/.ghc-wasm:$PATH"

RUN git clone --depth 1 https://github.com/th0jensen/automata.git /automata
RUN chmod +x /automata/build.sh && \
    cd /automata && \
    bash -c 'source "$HOME/.ghc-wasm/env" && ./build.sh all'

FROM rust:latest AS builder
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
WORKDIR /app
COPY . .
RUN touch .env
RUN bun install --frozen-lockfile

RUN mkdir -p ./backend/static/automaton
COPY --from=wasm-builder /automata/automaton.wasm ./backend/static/automaton/automaton.wasm
COPY --from=wasm-builder /automata/automaton.js   ./backend/static/automaton/automaton.js
COPY --from=wasm-builder /automata/patterns       ./backend/static/automaton/patterns

RUN bunx nx run portfolio:build --output-style=static

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
