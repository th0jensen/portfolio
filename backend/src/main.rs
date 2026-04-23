use crate::types::Data;
use axum::{Router, extract::State};
use axum_prometheus::{
    PrometheusMetricLayer, metrics_exporter_prometheus::PrometheusHandle,
};
use futures::future::join_all;
use http::{HeaderValue, header};
use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer, set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;
mod routes;
mod types;

#[derive(Clone)]
pub struct AppState {
    page_store: Arc<PageStore>,
    github_api_key: Arc<String>,
    resend_api_key: Arc<String>,
    contact_mail: Arc<String>,
    sender_mail: Arc<String>,
    data: Arc<Data>,
    dist_dir: Arc<String>,
    static_dir: Arc<String>,
    metric_handle: Arc<PrometheusHandle>,
}

struct PageStore {
    pages: HashMap<String, String>,
}

#[tokio::main]
async fn main() {
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(
            |_| EnvFilter::new("backend=info,tower_http=warn,axum=warn"),
        ))
        .init();

    let static_dir = std::env::var("STATIC_DIR")
        .unwrap_or_else(|_| "../backend/static".to_string());
    let dist_dir = std::env::var("DIST_DIR")
        .unwrap_or_else(|_| "../frontend/dist".to_string());
    let endpoints: [String; 5] = [
        "/".into(),
        "/projects".into(),
        "/experience".into(),
        "/contact".into(),
        "/error".into(),
    ];

    let pages: HashMap<String, String> = join_all(endpoints.iter().map(|e| {
        let e = e.to_owned();
        let dist_dir = dist_dir.clone();

        async move {
            let path = e.trim_start_matches('/');
            let key = if path.is_empty() { "index" } else { path };
            let file_path = format!("{}/{}.html", dist_dir, key);
            match tokio::fs::read_to_string(&file_path).await {
                Ok(html) => return (key.to_owned(), html),
                Err(e) => {
                    tracing::warn!(path = %file_path, error = %e, "failed to load page");
                    return (key.to_owned(), String::new());
                }
            }
        }
    }))
    .await
    .into_iter()
    .collect();

    let loaded_count = pages.values().filter(|v| !v.is_empty()).count();
    tracing::info!(
        loaded = loaded_count,
        total = pages.len(),
        "page store initialized"
    );

    let state = AppState {
        page_store: Arc::new(PageStore { pages }),
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
        metric_handle: Arc::new(metric_handle.clone()),
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

    let app: Router = Router::new()
        .merge(routes::pages::router())
        .merge(routes::assets::router(State(&state)))
        .nest("/api", routes::api::router())
        .fallback(routes::pages::error_handler)
        .route_layer(headers)
        .layer(prometheus_layer)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!(addr = %addr, "server starting");

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
