use crate::types::Data;
use axum::Router;
use http::{HeaderValue, header};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
};
mod routes;
mod types;

#[derive(Clone)]
struct AppState {
    data: Arc<Data>,
    dist_dir: Arc<String>,
}

const URL: &str = "0.0.0.0";
const PORT: &str = "8080";

#[tokio::main]
async fn main() {
    let static_dir = std::env::var("STATIC_DIR")
        .unwrap_or_else(|_| "../backend/static".to_string());
    let dist_dir = std::env::var("DIST_DIR")
        .unwrap_or_else(|_| "../frontend/dist".to_string());

    let state = AppState {
        data: Arc::new(Data::get()),
        dist_dir: Arc::new(dist_dir.clone()),
    };

    let compression = CompressionLayer::new()
        .gzip(true)
        .br(true)
        .deflate(true)
        .zstd(true);

    let app: Router = Router::new()
        .merge(routes::pages::router())
        .nest("/api", routes::api::router())
        .nest_service(
            "/robots.txt",
            ServeFile::new(format!("{}/robots.txt", static_dir)),
        )
        .nest_service("/static", ServeDir::new(static_dir))
        .nest_service("/assets", ServeDir::new(format!("{}/assets", &dist_dir)))
        .fallback(routes::pages::error_handler)
        .route_layer(ServiceBuilder::new().layer(compression).layer(
            SetResponseHeaderLayer::overriding(
                header::CACHE_CONTROL,
                HeaderValue::from_static("public, max-age=300"),
            ),
        ))
        .with_state(state);

    let path = format!("{}:{}", URL, PORT);
    let listener = tokio::net::TcpListener::bind(&path).await.unwrap();
    println!("Listening on: http://{}", &path);
    axum::serve(listener, app).await.unwrap();
}
