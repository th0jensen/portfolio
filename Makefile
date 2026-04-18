.PHONY: dev build deploy

# build.rs spawns `bun run build` automatically before compiling.
dev:
	cd backend && RUST_LOG=INFO cargo run

build:
	cd backend && cargo build --release

deploy:
	cd backend && cargo build --release
	./backend/target/release/backend
