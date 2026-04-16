use crate::types::Data;
use axum::Router;
use std::sync::Arc;
use tower_http::services::ServeDir;
mod routes;
mod templates;
mod types;

#[derive(Clone)]
struct AppState {
    data: Arc<Data>,
    header_html: Arc<String>,
}

const URL: &str = "0.0.0.0";
const PORT: &str = "8080";

#[tokio::main]
async fn main() {
    let static_dir = std::env::var("STATIC_DIR")
        .unwrap_or_else(|_| "../backend/static".to_string());
    let dist_dir = std::env::var("DIST_DIR")
        .unwrap_or_else(|_| "../frontend/dist".to_string());

    let header_html = std::fs::read_to_string(format!("{}/prerendered/header.html", dist_dir))
        .unwrap_or_else(|_| panic!("Missing {dist_dir}/prerendered/header.html — run `bun run build` first"));

    let state = AppState {
        data: Arc::new(Data::get()),
        header_html: Arc::new(header_html),
    };

    let app: Router = Router::new()
        .nest("/api", routes::api::router())
        .nest_service("/static", ServeDir::new(static_dir))
        .nest_service("/assets", ServeDir::new(format!("{}/assets", &dist_dir)))
        .fallback(routes::pages::page_handler)
        .with_state(state);

    let path = format!("{}:{}", URL, PORT);
    let listener = tokio::net::TcpListener::bind(&path).await.unwrap();
    println!("Listening on: http://{}", &path);
    axum::serve(listener, app).await.unwrap();
}
