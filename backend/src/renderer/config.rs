use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use crate::{
    types::{Assets, Data as PortfolioData},
    util::{get_env_key, get_env_key_or},
};

use super::{assets::load_assets, route::DEFAULT_SITE_ORIGIN};

#[derive(Debug)]
pub struct RendererConfig {
    pub exe: PathBuf,
    pub args: Vec<String>,
    pub origin: String,
    pub site_origin: String,
    pub assets: Assets,
    /// Used to resolve per-project titles/descriptions in `RenderRoute::head`
    /// without re-parsing `data.json` on every render.
    pub data: Arc<PortfolioData>,
    pub timeout: Duration,
    pub cold_timeout: Duration,
    pub startup_timeout: Duration,
    pub cache_ttl: Duration,
}

impl RendererConfig {
    // Not `Default`: this reads required environment variables and panics when
    // they are missing, which is not what a caller expects from `default()`.
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        let assets = load_assets(Path::new(&get_env_key("DIST_DIR"))).unwrap_or_else(|e| {
            panic!(
                "failed to load frontend assets from Vite manifest; run `deno task build` in frontend first: {e:#}"
            )
        });

        Self {
            exe: PathBuf::from(get_env_key("RENDERER_BIN")),
            args: Vec::new(),
            origin: get_env_key("AXUM_ORIGIN"),
            site_origin: get_env_key_or("SITE_ORIGIN", DEFAULT_SITE_ORIGIN),
            assets,
            data: Arc::new(PortfolioData::get()),
            timeout: Duration::from_secs(5),
            cold_timeout: Duration::from_secs(15),
            startup_timeout: Duration::from_secs(20),
            cache_ttl: Duration::from_secs(60),
        }
    }
}
