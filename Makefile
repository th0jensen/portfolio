include .env
export

.PHONY: dev build deploy

# build.rs spawns `bun run build` automatically before compiling.
init:
	cd frontend && bun install && bunx vite build

lint:
	cd backend && cargo clippy
	cd frontend && bunx tsc --noEmit

dev:
	cd backend && RUST_LOG=DEBUG cargo run

build:
	cd backend && cargo build --release

deploy:
	cd backend && cargo build --release
	RUST_LOG=INFO ./backend/target/release/backend
