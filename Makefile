include .env
export

.PHONY: dev build deploy

# build.rs spawns `bun run build` automatically before compiling.
types:
	rm -rf frontend/src/types/
	cd backend && SKIP_BUN_BUILD=1 cargo test

dev:
	cd backend && RUST_LOG=DEBUG cargo run

build:
	cd backend && RUST_LOG=INFO cargo build --release

deploy:
	cd backend && cargo build --release
	RUST_LOG=INFO ./backend/target/release/backend
