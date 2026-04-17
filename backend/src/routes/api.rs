use axum::{Router, extract::State, routing::get};
use serde::Deserialize;

use crate::{AppState, types::{Data, ExperienceItem}};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/data", get(get_data))
        .route("/experience", get(get_experience))
}

pub async fn get_data(State(state): State<AppState>) -> axum::Json<Data> {
    axum::Json((*state.data).clone())
}

#[derive(Deserialize)]
struct ZedExtensionEntry {
    download_count: i64,
}

#[derive(Deserialize)]
struct ZedExtensionResponse {
    data: Vec<ZedExtensionEntry>,
}

async fn fetch_zed_downloads(client: &reqwest::Client, extension_id: &str) -> Option<i64> {
    let url = format!("https://api.zed.dev/extensions/{}", extension_id);
    client
        .get(&url)
        .send()
        .await
        .ok()?
        .json::<ZedExtensionResponse>()
        .await
        .ok()
        .and_then(|r| r.data.into_iter().next().map(|e| e.download_count))
}

pub async fn get_experience(State(state): State<AppState>) -> axum::Json<Vec<ExperienceItem>> {
    let client = reqwest::Client::new();

    let (zed_dl, gruber_dl) = tokio::join!(
        fetch_zed_downloads(&client, "zed"),
        fetch_zed_downloads(&client, "gruber-darker"),
    );

    let items = state
        .data
        .experience_items
        .iter()
        .map(|item| {
            let mut item = item.clone();
            item.downloads = match item.zed_extension_id.as_deref() {
                Some("zed") => zed_dl,
                Some("gruber-darker") => gruber_dl,
                _ => None,
            };
            item
        })
        .collect();

    axum::Json(items)
}
