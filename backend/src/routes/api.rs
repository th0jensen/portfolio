use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::{Duration, Instant},
};

use qubit::{Router, handler};
use serde::Deserialize;

use crate::{AppState, types};

pub fn router() -> Router<AppState> {
    let router = Router::new()
        .handler(data)
        .handler(experience)
        .handler(lastfm);

    router.write_bindings_to_dir("../frontend/src/bindings");
    router
}

#[handler(query)]
async fn lastfm(ctx: AppState) -> Option<types::NowPlayingTrack> {
    match ctx.lastfm_client.now_playing().await {
        Ok(track) => track.map(Into::into),
        Err(e) => {
            tracing::error!(e = %e, "failed to reach last.fm");
            None
        }
    }
}

#[handler(query)]
async fn data(ctx: AppState) -> types::Data {
    tracing::debug!("serving data");
    (*ctx.data).clone()
}

#[handler(query)]
async fn experience(ctx: AppState) -> Vec<types::ExperienceItem> {
    const TTL: Duration = Duration::from_secs(3 * 24 * 60 * 60);

    let cached = ctx.experience_cache.read().ok().and_then(|guard| {
        guard
            .as_ref()
            .and_then(|(at, items)| (at.elapsed() < TTL).then(|| items.clone()))
    });

    if let Some(items) = cached {
        tracing::debug!("serving experience from cache");
        return items;
    }

    tracing::info!("fetching experience data");
    let client = reqwest::Client::builder()
        .user_agent("portfolio-backend")
        .build()
        .expect("Failed to build HTTP client");

    let unique_repos: Vec<String> = {
        let mut seen = HashSet::new();
        ctx.data
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
                ctx.github_api_key.clone(),
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

    let items: Vec<types::ExperienceItem> = ctx
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

    if let Ok(mut cache) = ctx.experience_cache.write() {
        *cache = Some((Instant::now(), items.clone()));
    }

    items
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
    tracing::trace!(extension_id, "fetching extension downloads");
    let url = format!("https://api.zed.dev/extensions/{}", extension_id);

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
    tracing::trace!(repo = %repo, "fetching repo stars");
    let url = format!("https://api.github.com/repos/{}", repo);

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
