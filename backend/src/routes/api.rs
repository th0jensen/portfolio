use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use axum::{Router, extract::State, routing::get};
use serde::Deserialize;

use crate::{
    AppState,
    types::{Data, ExperienceItem},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/data", get(get_data))
        .route("/experience", get(get_experience))
        .route(
            "/metrics",
            get(|State(state): State<AppState>| async move {
                state.metric_handle.render()
            }),
        )
}

pub async fn get_data(State(state): State<AppState>) -> axum::Json<Data> {
    axum::Json((*state.data).clone())
}

#[derive(Deserialize)]
struct GitHubRepoInfo {
    stargazers_count: i64,
}

#[derive(Deserialize)]
struct ZedExtensionEntry {
    download_count: i64,
}

#[derive(Deserialize)]
struct ZedExtensionResponse {
    data: Vec<ZedExtensionEntry>,
}

async fn fetch_extension_downloads(
    client: &reqwest::Client,
    extension_id: &str,
) -> Option<i64> {
    let url = format!("https://api.zed.dev/extensions/{}", extension_id);
    tracing::debug!(extension_id, %url, "Fetching extension downloads");

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| tracing::error!(extension_id, error = %e, "Failed to send request"))
        .ok()?;

    let parsed = response
        .json::<ZedExtensionResponse>()
        .await
        .map_err(|e| tracing::error!(extension_id, error = %e, "Failed to deserialize response"))
        .ok()?;

    parsed.data.into_iter().next().map(|e| e.download_count)
}

async fn fetch_repo_stars(
    api_key: Arc<String>,
    client: reqwest::Client,
    repo: String,
) -> (String, Option<i64>) {
    let url = format!("https://api.github.com/repos/{}", repo);
    tracing::debug!(repo, %url, "Fetching repo stars");

    let stars = async {
        let response = client
            .get(&url)
            .bearer_auth(api_key.as_str())
            .send()
            .await
            .map_err(|e| tracing::error!(repo, error = %e, "Failed to send request"))
            .ok()?;

        response
            .json::<GitHubRepoInfo>()
            .await
            .map_err(|e| tracing::error!(repo, error = %e, "Failed to deserialize repo info"))
            .ok()
            .map(|r| r.stargazers_count)
    }
    .await;

    (repo, stars)
}

pub async fn get_experience(
    State(state): State<AppState>,
) -> axum::Json<Vec<ExperienceItem>> {
    let client = reqwest::Client::builder()
        .user_agent("portfolio-backend")
        .build()
        .expect("Failed to build HTTP client");

    let unique_repos: Vec<String> = {
        let mut seen = HashSet::new();
        state
            .data
            .experience_items
            .iter()
            .map(|item| item.name.clone())
            .filter(|name| seen.insert(name.clone()))
            .collect()
    };

    let handles: Vec<_> = unique_repos
        .iter()
        .map(|repo| {
            tokio::spawn(fetch_repo_stars(
                state.github_api_key.clone(),
                client.clone(),
                repo.clone(),
            ))
        })
        .collect();

    let (gruber_dl, stars) = tokio::join!(
        fetch_extension_downloads(&client, "gruber-darker"),
        async {
            let mut stars: HashMap<String, i64> = HashMap::new();
            for handle in handles {
                if let Ok((repo, Some(count))) = handle.await {
                    stars.insert(repo, count);
                }
            }
            stars
        }
    );

    let items = state
        .data
        .experience_items
        .iter()
        .map(|item| {
            let mut item = item.clone();
            if let Some(&s) = stars.get(&item.name) {
                item.stars = s;
            }
            if item.zed_extension_id.as_deref() == Some("gruber-darker") {
                item.downloads = gruber_dl.or(item.downloads);
            }
            item
        })
        .collect();

    axum::Json(items)
}
