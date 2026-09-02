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
        .route("/projects/{slug}", get(page_handler))
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

    if let RenderRoute::Project(slug) = &route
        && !state
            .data
            .projects
            .iter()
            .any(|project| &project.slug == slug)
    {
        return not_found_response();
    }

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

/// Inlines the font CSS immediately before `</head>` so the fonts are declared
/// before the body paints. A document without a head is left untouched rather
/// than having the CSS appended somewhere it would not apply.
fn inject_font_css(html: &mut String, css: &str) {
    if let Some(head_end) = html.find("</head>") {
        html.insert_str(head_end, css);
    }
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

            inject_font_css(&mut html, state.font_css.as_ref());

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

#[cfg(test)]
mod tests {
    use axum::{body::Body, body::to_bytes};
    use http::Request;
    use tower::ServiceExt;

    use super::*;
    use crate::{
        renderer::{RendererClient, test_support::fake_renderer_config},
        state::AppState,
    };

    const FONT_CSS: &str = "<style>/* fonts */</style>";

    /// A router backed by the fake renderer: `/` and project routes answer
    /// normally, `/experience` kills the worker mid-request, and `/projects`
    /// replies with malformed JSON. See frontend/src/fake-render-worker.ts.
    async fn test_router() -> Router {
        let renderer = RendererClient::new(fake_renderer_config(None))
            .await
            .expect("fake renderer should start; is `deno` on PATH?");
        let state = AppState::for_tests(renderer, FONT_CSS).await;

        router().with_state(state)
    }

    async fn get(router: Router, path: &str) -> (StatusCode, String) {
        let response = router
            .oneshot(Request::get(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = response.status();

        (status, body_of(response).await)
    }

    async fn body_of(response: Response) -> String {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn not_found_response_is_a_404_html_page_that_forbids_indexing() {
        let response = not_found_response();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert_eq!(
            response
                .headers()
                .get(http::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok()),
            Some("text/html; charset=utf-8")
        );

        let body = body_of(response).await;
        // A 404 that Google indexes is a soft-404; the meta tag is the fix.
        assert!(body.contains(r#"<meta name="robots" content="noindex">"#));
        assert!(body.contains("<title>Not Found</title>"));
        assert!(body.contains(r#"<a href="/">"#), "needs a way back");
    }

    #[tokio::test]
    async fn error_handler_serves_the_same_static_404() {
        let uri = "/nope".parse::<http::Uri>().unwrap();
        let response = error_handler(OriginalUri(uri)).await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert_eq!(body_of(response).await, NOT_FOUND_HTML);
    }

    #[test]
    fn font_css_is_injected_just_before_the_head_closes() {
        let mut html = "<head><title>t</title></head><body></body>".to_owned();

        inject_font_css(&mut html, "<style>@font-face{}</style>");

        assert_eq!(
            html,
            "<head><title>t</title><style>@font-face{}</style></head><body></body>"
        );
    }

    #[test]
    fn font_css_injection_leaves_a_headless_document_alone() {
        let mut html = "<body>no head here</body>".to_owned();

        inject_font_css(&mut html, "<style>@font-face{}</style>");

        assert_eq!(html, "<body>no head here</body>");
    }

    #[tokio::test]
    async fn a_known_page_is_rendered_and_returned_as_html() {
        let (status, body) = get(test_router().await, "/").await;

        assert_eq!(status, StatusCode::OK);
        assert!(body.contains("<html>/:1</html>"), "got: {body}");
    }

    #[tokio::test]
    async fn a_project_route_renders_when_the_slug_exists() {
        let (status, body) =
            get(test_router().await, "/projects/crabdash").await;

        assert_eq!(status, StatusCode::OK);
        assert!(body.contains("/projects/crabdash"), "got: {body}");
    }

    /// The renderer would happily render a page for a slug that has no project
    /// behind it, so the handler has to reject it before spending a render.
    #[tokio::test]
    async fn an_unknown_project_slug_is_a_404_and_never_reaches_the_renderer() {
        let router = test_router().await;

        let (status, body) =
            get(router.clone(), "/projects/not-a-project").await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body, NOT_FOUND_HTML);

        // The fake renderer numbers its replies per process, so a first call
        // still being call 1 proves the 404 above never rendered anything.
        let (status, body) = get(router, "/").await;
        assert_eq!(status, StatusCode::OK);
        assert!(body.contains("<html>/:1</html>"), "got: {body}");
    }

    /// A renderer that dies mid-request must surface as "try again later",
    /// not as a 200 with a broken page.
    #[tokio::test]
    async fn a_renderer_that_crashes_mid_request_is_a_503() {
        let (status, _) = get(test_router().await, "/experience").await;

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    }

    /// Malformed JSON from the renderer is a protocol failure, same as a crash.
    #[tokio::test]
    async fn a_renderer_reply_that_is_not_json_is_a_503() {
        let (status, _) = get(test_router().await, "/projects").await;

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    }

    /// The renderer echoes a mismatched id for this route, which means a reply
    /// was paired with the wrong request — never safe to serve.
    #[tokio::test]
    async fn a_response_id_mismatch_is_a_503() {
        let (status, _) = get(test_router().await, "/contact").await;

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn the_font_css_is_inlined_into_a_rendered_document() {
        let mut html = "<head></head>".to_owned();

        inject_font_css(&mut html, FONT_CSS);

        assert_eq!(html, format!("<head>{FONT_CSS}</head>"));
    }
}
