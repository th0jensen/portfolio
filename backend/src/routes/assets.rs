use axum::{Router, extract::State};
use tower_http::services::{ServeDir, ServeFile};

use crate::AppState;

pub fn router(State(state): State<&AppState>) -> Router<AppState> {
    Router::new()
        .nest_service(
            "/robots.txt",
            ServeFile::new(format!("{}/robots.txt", state.static_dir)),
        )
        .nest_service(
            "/sitemap.xml",
            ServeFile::new(format!("{}/sitemap.xml", state.static_dir)),
        )
        .nest_service("/static", ServeDir::new(format!("{}", state.static_dir)))
        .nest_service(
            "/assets",
            ServeDir::new(format!("{}/assets", state.dist_dir)),
        )
}
