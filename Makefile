.PHONY: dev build deploy

dev:
	cd frontend && bun run build
	cd backend && cargo run

build:
	cd frontend && bun run build
	cd backend && cargo build --release

deploy:
	cd frontend && bun run build
	cd backend && cargo build --release
	./backend/target/release/backend
