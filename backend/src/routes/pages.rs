use axum::{
    Router,
    extract::{OriginalUri, State},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use http::{HeaderName, HeaderValue, StatusCode};

use crate::AppState;

pub fn router() -> Router<AppState<'static>> {
    Router::new()
        .route("/", get(page_handler))
        .route("/projects", get(page_handler))
        .route("/experience", get(page_handler))
        .route("/contact", get(page_handler))
        .route("/automata", get(page_handler))
        .fallback(error_handler)
}

pub async fn page_handler(
    State(state): State<AppState<'static>>,
    OriginalUri(uri): OriginalUri,
) -> Response {
    let url = uri.path_and_query().map_or("/", |p| p.as_str());
    tracing::info!(url, "rendering page");
    render_page(&state, url, None).await
}

pub async fn error_handler(
    State(state): State<AppState<'static>>,
    OriginalUri(uri): OriginalUri,
) -> Response {
    tracing::debug!(uri = %uri, "rendering 404");
    render_page(&state, "/error", Some(StatusCode::NOT_FOUND)).await
}

async fn render_page(
    state: &AppState<'static>,
    url: &str,
    status_override: Option<StatusCode>,
) -> Response {
    match state.renderer.render(url).await {
        Ok(output) => {
            if let Some(error) = output.error {
                tracing::error!(url, %error, "SSR renderer returned an error");
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            };

            let Some(html) = output.html else {
                tracing::error!(url, "SSR renderer returned no html");
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            };

            let rendered_status = StatusCode::from_u16(output.status)
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let status = if rendered_status.is_redirection() {
                rendered_status
            } else {
                status_override.unwrap_or(rendered_status)
            };
            let mut response = (status, Html(html)).into_response();

            for (name, value) in output.headers {
                let Ok(name) = HeaderName::try_from(name) else {
                    tracing::error!(
                        url,
                        "SSR renderer returned an invalid header name"
                    );
                    return StatusCode::INTERNAL_SERVER_ERROR.into_response();
                };
                let Ok(value) = HeaderValue::try_from(value) else {
                    tracing::error!(
                        url,
                        "SSR renderer returned an invalid header value"
                    );
                    return StatusCode::INTERNAL_SERVER_ERROR.into_response();
                };
                response.headers_mut().insert(name, value);
            }

            response
        }
        Err(error) => {
            tracing::error!(
                url,
                ?error,
                "failed to communicate with SSR renderer"
            );
            StatusCode::SERVICE_UNAVAILABLE.into_response()
        }
    }
}
