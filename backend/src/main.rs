use crate::{
    routes::{api::router, assets, pages},
    state::{AppState, env_filter, headers, metrics_handler},
};

use axum::{Router, extract::State, routing::get};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;

mod routes;
mod state;
mod types;

const ENDPOINTS: [&str; 6] = [
    "/",
    "/automata",
    "/projects",
    "/experience",
    "/contact",
    "/error",
];

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(env_filter())
        .init();

    let state = AppState::new().await;
    let (qubit_service, qubit_handle) = router().to_service(state.clone());
    let app: Router = Router::new()
        .merge(assets::router(State(&state)))
        .merge(pages::router())
        .fallback(pages::error_handler)
        .route_layer(headers())
        .nest_service("/rpc", qubit_service)
        .layer(state.prometheus_layer.as_ref().clone())
        .route("/api/metrics", get(metrics_handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!(addr = %addr, "server starting");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
    qubit_handle.stop().unwrap();
}
