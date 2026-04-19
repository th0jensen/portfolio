use crate::types::Data;
use axum::{Router, extract::State};
use http::{HeaderValue, header};
use std::{net::SocketAddr, sync::Arc};
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer, set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::EnvFilter;
mod routes;
mod types;

#[derive(Clone)]
pub struct AppState {
    github_api_key: Arc<String>,
    resend_api_key: Arc<String>,
    contact_mail: Arc<String>,
    sender_mail: Arc<String>,
    data: Arc<Data>,
    dist_dir: Arc<String>,
    static_dir: Arc<String>,
}

#[tokio::main]
async fn main() {
    let static_dir = std::env::var("STATIC_DIR")
        .unwrap_or_else(|_| "../backend/static".to_string());
    let dist_dir = std::env::var("DIST_DIR")
        .unwrap_or_else(|_| "../frontend/dist".to_string());
    let state = AppState {
        github_api_key: Arc::new(
            std::env::var("GITHUB_API_KEY").expect("Missing GITHUB_API_KEY"),
        ),
        resend_api_key: Arc::new(
            std::env::var("RESEND_API_KEY").expect("Missing RESEND_API_KEY"),
        ),
        contact_mail: Arc::new(
            std::env::var("CONTACT_MAIL").expect("Missing CONTACT_MAIL"),
        ),
        sender_mail: Arc::new(
            std::env::var("SENDER_MAIL").expect("Missing SENDER_MAIL"),
        ),
        data: Arc::new(Data::get()),
        dist_dir: Arc::new(dist_dir.clone()),
        static_dir: Arc::new(static_dir.clone()),
    };

    let compression = CompressionLayer::new()
        .gzip(true)
        .br(true)
        .deflate(true)
        .zstd(true);

    let headers = ServiceBuilder::new().layer(compression).layer(
        SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=300"),
        ),
    );

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| {
                    EnvFilter::try_new(
                        "axum__tracing_example=error,tower_http=warn",
                    )
                })
                .unwrap(),
        )
        .init();

    let app: Router = Router::new()
        .merge(routes::pages::router())
        .merge(routes::assets::router(State(&state)))
        .nest("/api", routes::api::router())
        .fallback(routes::pages::error_handler)
        .route_layer(headers)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
