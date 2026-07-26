use axum::{
    Router,
    body::Body,
    extract::{Path, State},
    response::IntoResponse,
    routing::get,
};
use http::{Response, StatusCode, Uri, header};
use tokio_util::io::ReaderStream;
use tower_http::services::{ServeDir, ServeFile};

use crate::{AppState, routes::pages::error_handler};

const ASSETS: [&str; 10] = [
    "headshot.jpg",
    "fonts/alef-700.ttf",
    "fonts/alef-400.ttf",
    "images/appleosophy.webp",
    "images/automaton.svg",
    "images/crabdash.webp",
    "images/zed.webp",
    "resume.pdf",
    "automaton/automaton.js",
    "automaton/automaton.wasm",
];

pub fn router(State(state): State<&AppState>) -> Router<AppState<'static>> {
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
        .nest_service(
            "/assets",
            ServeDir::new(format!("{}/assets", state.dist_dir)),
        )
}

pub async fn s3_handler(
    State(state): State<AppState<'static>>,
    Path(path): Path<String>,
    uri: Uri,
) -> Result<impl IntoResponse, Response<Body>> {
    if let Some(asset_name) = ASSETS.iter().find(|&&asset| asset == path) {
        let asset_name = asset_name.to_owned();
        let asset = match state
            .s3
            .get_object()
            .bucket(state.bucket.as_ref())
            .key(asset_name)
            .send()
            .await
        {
            Ok(asset) => asset,
            Err(err) => {
                tracing::error!(?err, "failed to fetch from S3");
                return Err(error_handler(State(state), uri)
                    .await
                    .into_response());
            }
        };

        let content_type = asset
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();

        let file_name = std::path::Path::new(asset_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file");

        let content_length = asset
            .content_length()
            .map(|len| len.to_string())
            .unwrap_or_else(|| "0".to_string());

        let async_reader = asset.body.into_async_read();
        let byte_stream = ReaderStream::new(async_reader);
        let body = Body::from_stream(byte_stream);

        match Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type)
            .header(header::CONTENT_LENGTH, content_length)
            .header(
                header::CONTENT_DISPOSITION,
                format!("inline; filename=\"{}\"", file_name),
            )
            .body(body)
        {
            Ok(response) => Ok(response),
            Err(err) => {
                tracing::error!(?err, "failed to construct asset response");
                Err(error_handler(State(state), uri).await.into_response())
            }
        }
    } else {
        tracing::warn!("Asset not found: {:?}", path);
        Err(error_handler(State(state), uri).await.into_response())
    }
}
