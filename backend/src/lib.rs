//! Portfolio backend: server-rendered pages, a JSON-RPC data API, and asset
//! serving.
//!
//! The server lives here rather than in `main.rs` so the binary stays a thin
//! entry point and the integration tests under `tests/` can drive the same code
//! the server runs.

pub mod renderer;
pub mod routes;
pub mod state;
pub mod types;
pub mod util;

use std::net::SocketAddr;

use axum::{Router, extract::State, routing::get};
use tower_http::trace::TraceLayer;

use crate::{
    routes::{api::router, assets, mail, pages},
    state::{AppState, env_filter, headers, metrics_handler},
};

/// Loads configuration, builds the router, and serves until the process exits.
pub async fn run() {
    if let Err(error) = dotenvy::dotenv()
        && !error.not_found()
    {
        panic!("failed to load .env: {error}");
    }

    tracing_subscriber::fmt()
        .with_env_filter(env_filter())
        .init();

    let state = AppState::new().await;
    let (qubit_service, qubit_handle) = router().to_service(state.clone());
    let page_router = pages::router().route_layer(headers());
    let app: Router = Router::new()
        .merge(assets::router(State(&state)))
        .merge(page_router)
        .merge(mail::router())
        .fallback(pages::error_handler)
        .nest_service("/rpc", qubit_service)
        .layer(state.prometheus_layer.as_ref().clone())
        .route("/api/metrics", get(metrics_handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!(addr = %addr, "server starting");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
    qubit_handle.stop().unwrap();
}
