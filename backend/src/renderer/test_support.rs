//! Fixtures for tests that need a renderer but not the real one.
//!
//! The fake worker speaks the same line-delimited JSON protocol over stdin and
//! stdout as `render-worker.ts`, but never opens a socket, so tests using it can
//! run in parallel with the real-renderer suite in `tests/ssr.rs` (which has to
//! own port 8080 for its RPC stub).

use std::{path::PathBuf, sync::Arc, time::Duration};

use super::config::RendererConfig;
use crate::types::{Assets, Data as PortfolioData};

/// See the header of this script for the fault it injects per route.
const FAKE_RENDERER_SCRIPT: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../frontend/src/fake-render-worker.ts"
);

/// `startup_arg` selects a startup fault: `no-ready`, `bad-ready`, `slow-ready`.
pub(crate) fn fake_renderer_config(
    startup_arg: Option<&str>,
) -> RendererConfig {
    let mut args = vec![
        "run".to_owned(),
        "--no-config".to_owned(),
        FAKE_RENDERER_SCRIPT.to_owned(),
    ];
    args.extend(startup_arg.map(str::to_owned));

    RendererConfig {
        exe: PathBuf::from("deno"),
        args,
        origin: "http://localhost:8080".to_owned(),
        site_origin: "https://example.com".to_owned(),
        assets: Assets {
            css: "assets/index.css".to_owned(),
            js: "assets/index.js".to_owned(),
        },
        data: Arc::new(PortfolioData::get()),
        timeout: Duration::from_millis(700),
        cold_timeout: Duration::from_secs(3),
        startup_timeout: Duration::from_secs(5),
        cache_ttl: Duration::from_millis(300),
    }
}
