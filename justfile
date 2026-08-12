mod backend
mod frontend
mod cli

lint: backend::lint frontend::lint cli::lint
build: frontend::build backend::build
dev: frontend::dev backend::dev
init: frontend::init
install: frontend::install
clean: backend::clean cli::clean
ci: lint test build

# Only rebuilds the frontend renderer if it isn't already there; the
# real-renderer smoke test just needs the binary to exist, not to be fresh.
test:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -x frontend/dist/renderer ]; then
        just frontend::build
    fi
    just backend::test
