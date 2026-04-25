use axum::{
    Router,
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    routing::get,
};

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
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index" } else { path };
    tracing::info!(path, "serving page");
    match state.page_store.pages.get(path) {
        Some(html) => Html(html.to_owned()).into_response(),
        None => error_handler(State(state), uri).await.into_response(),
    }
}

pub async fn error_handler(
    State(state): State<AppState>,
    uri: Uri,
) -> impl IntoResponse {
    tracing::debug!(uri = %uri, "serving 404");
    match state.page_store.pages.get("error") {
        Some(html) => {
            (axum::http::StatusCode::NOT_FOUND, Html(html.to_owned()))
                .into_response()
        }
        None => {
            tracing::error!(uri = %uri, "error page missing from page store");
            (
                axum::http::StatusCode::NOT_FOUND,
                Html("<h1>Not Found</h1>".to_string()),
            )
                .into_response()
        }
    }
}
