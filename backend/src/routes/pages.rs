use axum::{
    Router,
    extract::{OriginalUri, State},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use http::{HeaderName, HeaderValue, StatusCode};

use crate::{AppState, renderer::RenderRoute};

const NOT_FOUND_HTML: &str = "<!doctype html><html lang=\"en\" class=\"dark\" style=\"color-scheme:dark\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Not Found</title></head><body><main><h1>404</h1><p>The requested page was not found.</p><a href=\"/\">Return home</a></main></body></html>";

pub fn router() -> Router<AppState<'static>> {
    Router::new()
        .route("/", get(page_handler))
        .route("/projects", get(page_handler))
        .route("/experience", get(page_handler))
        .route("/contact", get(page_handler))
        .route("/automata", get(page_handler))
}

pub async fn page_handler(
    State(state): State<AppState<'static>>,
    OriginalUri(uri): OriginalUri,
) -> Response {
    let Some(route) = RenderRoute::from_path(uri.path()) else {
        return not_found_response();
    };
    tracing::info!(url = route.path(), "rendering page");
    render_page(&state, route).await
}

pub async fn error_handler(OriginalUri(uri): OriginalUri) -> Response {
    tracing::debug!(uri = %uri, "serving static 404");
    not_found_response()
}

pub fn not_found_response() -> Response {
    (StatusCode::NOT_FOUND, Html(NOT_FOUND_HTML)).into_response()
}

async fn render_page(
    state: &AppState<'static>,
    route: RenderRoute,
) -> Response {
    let url = route.path();
    match state.renderer.render(route).await {
        Ok(output) => {
            if let Some(error) = output.error {
                tracing::error!(url, %error, "SSR renderer returned an error");
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            };

            let Some(mut html) = output.html else {
                tracing::error!(url, "SSR renderer returned no html");
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            };

            if let Some(head_end) = html.find("</head>") {
                html.insert_str(head_end, state.font_css.as_ref());
            }

            let rendered_status = StatusCode::from_u16(output.status)
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let mut response = (rendered_status, Html(html)).into_response();

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
