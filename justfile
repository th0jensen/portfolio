mod backend
mod frontend
mod cli

lint: backend::lint frontend::lint cli::lint
build: frontend::build backend::build
dev: backend::dev
init: frontend::install
clean: backend::clean cli::clean
ci: lint build
