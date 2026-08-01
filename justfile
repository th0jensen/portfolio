mod backend
mod frontend
mod cli

lint: backend::lint frontend::lint cli::lint
build: frontend::build backend::build
dev: frontend::dev backend::dev
init: frontend::init
install: frontend::install
clean: backend::clean cli::clean
ci: lint build
