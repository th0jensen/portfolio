use axum::{
    Router,
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    routing::get,
};
use tracing::info;

use crate::{AppState, routes::mail::dispatch_email};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(page_handler))
        .route("/projects", get(page_handler))
        .route("/experience", get(page_handler))
        .route("/contact", get(page_handler).post(dispatch_email))
        .fallback(error_handler)
}

pub async fn page_handler(
    State(state): State<AppState>,
    uri: Uri,
) -> impl IntoResponse {
    info!("Handling page request for: {:?}", uri);
    let path = uri.path().trim_start_matches('/');
    let filename = if path.is_empty() { "index" } else { path };
    let file_path = format!("{}/{}.html", state.dist_dir, filename);
    match tokio::fs::read_to_string(&file_path).await {
        Ok(html) => Html(html).into_response(),
        Err(_) => error_handler(State(state), uri).await.into_response(),
    }
}

pub async fn error_handler(
    State(state): State<AppState>,
    uri: Uri,
) -> impl IntoResponse {
    info!("Handling error page request. Attempted Uri: {:?}", uri);
    let file_path = format!("{}/error.html", state.dist_dir);
    match tokio::fs::read_to_string(&file_path).await {
        Ok(html) => {
            (axum::http::StatusCode::NOT_FOUND, Html(html)).into_response()
        }
        Err(_) => (
            axum::http::StatusCode::NOT_FOUND,
            Html("<h1>Not Found</h1>".to_string()),
        )
            .into_response(),
    }
}
