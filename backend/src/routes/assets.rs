use axum::{
    Router,
    body::Body,
    extract::{Path, State},
    response::{IntoResponse, Response},
    routing::get,
};
use http::{HeaderMap, HeaderValue, StatusCode, header};
use tokio_util::io::ReaderStream;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
};

use crate::{AppState, routes::pages::not_found_response};

const HEADSHOT_CACHE_CONTROL: &str = "public, max-age=86400";

const ASSETS: [&str; 17] = [
    "headshot.webp",
    "images/og-card.png",
    "images/og-card.webp",
    "fonts/alef-700.woff2",
    "fonts/alef-400.woff2",
    "images/appleosophy.webp",
    "images/automaton.svg",
    "images/crabdash.webp",
    "images/zed.webp",
    "resume.pdf",
    "automaton/automaton.js",
    "automaton/automaton.wasm",
    "automaton/patterns/conway/oscillator.toml",
    "automaton/patterns/seeds/triangle.toml",
    "automaton/patterns/briansbrain/diamond.toml",
    "automaton/patterns/wireworld/circular.toml",
    "automaton/patterns/wireworld/xor.toml",
];

pub fn router(State(state): State<&AppState>) -> Router<AppState<'static>> {
    let compression = CompressionLayer::new()
        .gzip(true)
        .br(true)
        .deflate(true)
        .zstd(true);

    let vite_assets = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        ))
        .layer(compression.clone())
        .service(ServeDir::new(format!("{}/assets", state.dist_dir)));

    Router::new()
        .route("/static/{*key}", get(s3_handler))
        .nest_service(
            "/robots.txt",
            ServeFile::new(format!("{}/robots.txt", state.static_dir)),
        )
        .nest_service(
            "/sitemap.xml",
            ServeFile::new(format!("{}/sitemap.xml", state.static_dir)),
        )
        .nest_service(
            "/favicon.svg",
            ServeFile::new(format!("{}/favicon.svg", state.static_dir)),
        )
        // `.layer` only wraps routes registered before this call, so this
        // leaves `/assets` (nested below) on its own compression layer
        // rather than double-wrapping it. The default predicate skips
        // already-compressed formats (JPG/PNG/WEBP/WOFF2) automatically but
        // still compresses the SVGs, WASM, JS, and pattern TOML files
        // served from S3 above.
        .layer(compression)
        .nest_service("/assets", vite_assets)
}

pub async fn s3_handler(
    State(state): State<AppState<'static>>,
    Path(path): Path<String>,
    headers: HeaderMap,
) -> Response {
    let Some(asset_name) = ASSETS.iter().find(|&&asset| asset == path) else {
        tracing::debug!(path, "static asset is not allowlisted");
        return not_found_response();
    };

    let mut request = state
        .s3
        .get_object()
        .bucket(state.bucket.as_ref())
        .key(*asset_name);

    if let Some(value) = request_header(&headers, header::RANGE) {
        let Ok(value) = value else {
            return StatusCode::BAD_REQUEST.into_response();
        };
        request = request.range(value);
    }
    if let Some(value) = request_header(&headers, header::IF_NONE_MATCH) {
        let Ok(value) = value else {
            return StatusCode::BAD_REQUEST.into_response();
        };
        request = request.if_none_match(value);
    }
    if let Some(value) = request_header(&headers, header::IF_MATCH) {
        let Ok(value) = value else {
            return StatusCode::BAD_REQUEST.into_response();
        };
        request = request.if_match(value);
    }

    let asset = match request.send().await {
        Ok(asset) => asset,
        Err(error) => {
            let upstream_status = error
                .raw_response()
                .map(|response| response.status().as_u16());

            return match upstream_status {
                Some(304) if *asset_name == "headshot.webp" => (
                    StatusCode::NOT_MODIFIED,
                    [(header::CACHE_CONTROL, HEADSHOT_CACHE_CONTROL)],
                )
                    .into_response(),
                Some(304) => StatusCode::NOT_MODIFIED.into_response(),
                Some(404) => not_found_response(),
                Some(416) => StatusCode::RANGE_NOT_SATISFIABLE.into_response(),
                _ => {
                    tracing::error!(
                        ?error,
                        asset = *asset_name,
                        "failed to fetch static asset from S3"
                    );
                    StatusCode::BAD_GATEWAY.into_response()
                }
            };
        }
    };

    let status = if asset.content_range().is_some() {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };
    let file_name = std::path::Path::new(asset_name)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("file");
    let content_disposition = asset
        .content_disposition()
        .map(str::to_owned)
        .unwrap_or_else(|| format!("inline; filename=\"{file_name}\""));

    let mut response = Response::builder()
        .status(status)
        .header(
            header::CONTENT_TYPE,
            asset.content_type().unwrap_or("application/octet-stream"),
        )
        .header(
            header::CACHE_CONTROL,
            if *asset_name == "headshot.webp" {
                HEADSHOT_CACHE_CONTROL
            } else {
                asset.cache_control().unwrap_or(
                    "public, max-age=3600, stale-while-revalidate=86400",
                )
            },
        )
        .header(header::CONTENT_DISPOSITION, content_disposition);

    if let Some(length) = asset.content_length().filter(|length| *length >= 0) {
        response = response.header(header::CONTENT_LENGTH, length);
    }
    if let Some(value) = asset.e_tag() {
        response = response.header(header::ETAG, value);
    }
    if let Some(value) = asset.accept_ranges() {
        response = response.header(header::ACCEPT_RANGES, value);
    }
    if let Some(value) = asset.content_range() {
        response = response.header(header::CONTENT_RANGE, value);
    }
    if let Some(value) = asset.expires_string() {
        response = response.header(header::EXPIRES, value);
    }

    let body =
        Body::from_stream(ReaderStream::new(asset.body.into_async_read()));
    response.body(body).unwrap_or_else(|error| {
        tracing::error!(?error, "failed to construct asset response");
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    })
}

fn request_header(
    headers: &HeaderMap,
    name: http::header::HeaderName,
) -> Option<Result<&str, http::header::ToStrError>> {
    headers.get(name).map(HeaderValue::to_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_header_is_none_when_absent() {
        let headers = HeaderMap::new();

        assert!(request_header(&headers, header::RANGE).is_none());
    }

    #[test]
    fn request_header_returns_the_value_when_present() {
        let mut headers = HeaderMap::new();
        headers.insert(header::RANGE, HeaderValue::from_static("bytes=0-1"));

        assert_eq!(
            request_header(&headers, header::RANGE).unwrap().unwrap(),
            "bytes=0-1"
        );
    }

    #[test]
    fn request_header_surfaces_non_utf8_values_as_an_error() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::IF_MATCH,
            HeaderValue::from_bytes(&[0xFF, 0xFE]).unwrap(),
        );

        assert!(request_header(&headers, header::IF_MATCH).unwrap().is_err());
    }

    #[tokio::test]
    async fn headshot_has_a_one_day_cache_including_ranges_and_revalidation() {
        use std::sync::Arc;

        use http::Request;
        use tower::ServiceExt;

        use crate::renderer::{
            RendererClient, test_support::fake_renderer_config,
        };

        let upstream = Router::new().route(
            "/{*key}",
            get(|headers: HeaderMap, uri: http::Uri| async move {
                let (status, body) =
                    if headers.contains_key(header::IF_NONE_MATCH) {
                        (StatusCode::NOT_MODIFIED, "")
                    } else if headers.contains_key(header::RANGE) {
                        (StatusCode::PARTIAL_CONTENT, "po")
                    } else {
                        (StatusCode::OK, "portrait")
                    };
                let mut response = (status, body).into_response();
                response.headers_mut().insert(
                    header::CONTENT_TYPE,
                    HeaderValue::from_static("image/webp"),
                );
                response.headers_mut().insert(
                    header::ETAG,
                    HeaderValue::from_static("\"portrait\""),
                );
                if status == StatusCode::PARTIAL_CONTENT {
                    response.headers_mut().insert(
                        header::CONTENT_RANGE,
                        HeaderValue::from_static("bytes 0-1/8"),
                    );
                }
                if !uri.path().ends_with("og-card.webp") {
                    response.headers_mut().insert(
                        header::CACHE_CONTROL,
                        HeaderValue::from_static("public, max-age=60"),
                    );
                }
                response
            }),
        );
        let listener =
            tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        });

        let renderer = RendererClient::new(fake_renderer_config(None))
            .await
            .unwrap();
        let mut state = AppState::for_tests(renderer, "").await;
        state.s3 = Arc::new(aws_sdk_s3::Client::from_conf(
            state
                .s3
                .config()
                .to_builder()
                .endpoint_url(origin)
                .force_path_style(true)
                .build(),
        ));
        let app = router(State(&state)).with_state(state);

        for (path, condition, status, cache, body) in [
            (
                "headshot.webp",
                None,
                StatusCode::OK,
                "public, max-age=86400",
                "portrait",
            ),
            (
                "headshot.webp",
                Some((header::RANGE, "bytes=0-1")),
                StatusCode::PARTIAL_CONTENT,
                "public, max-age=86400",
                "po",
            ),
            (
                "headshot.webp",
                Some((header::IF_NONE_MATCH, "\"portrait\"")),
                StatusCode::NOT_MODIFIED,
                "public, max-age=86400",
                "",
            ),
            (
                "images/zed.webp",
                None,
                StatusCode::OK,
                "public, max-age=60",
                "portrait",
            ),
            (
                "images/og-card.webp",
                None,
                StatusCode::OK,
                "public, max-age=3600, stale-while-revalidate=86400",
                "portrait",
            ),
        ] {
            let mut request = Request::get(format!("/static/{path}"));
            if let Some((name, value)) = condition {
                request = request.header(name, value);
            }
            let response = app
                .clone()
                .oneshot(request.body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), status, "{path}");
            assert_eq!(
                response.headers().get(header::CACHE_CONTROL).unwrap(),
                cache,
                "{path}"
            );
            if status != StatusCode::NOT_MODIFIED {
                assert_eq!(response.headers()[header::ETAG], "\"portrait\"");
            }
            if status == StatusCode::PARTIAL_CONTENT {
                assert_eq!(
                    response.headers()[header::CONTENT_RANGE],
                    "bytes 0-1/8"
                );
            }
            let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .unwrap();
            assert_eq!(bytes.as_ref(), body.as_bytes());
        }
        server.abort();
    }

    #[test]
    fn allowlist_includes_the_automaton_pattern_files() {
        assert_eq!(ASSETS.len(), 17);
        assert!(ASSETS.contains(&"automaton/patterns/conway/oscillator.toml"));
        assert!(ASSETS.contains(&"automaton/patterns/wireworld/xor.toml"));
    }
}
