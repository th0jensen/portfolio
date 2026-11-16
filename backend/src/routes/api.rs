use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::{Duration, Instant},
};

use qubit::{Router, handler};
use serde::Deserialize;

#[cfg(debug_assertions)]
use crate::routes::mail;
use crate::{AppState, types};

pub fn router() -> Router<AppState<'static>> {
    let router = Router::new()
        .handler(data)
        .handler(experience)
        .handler(render_input);

    #[cfg(debug_assertions)]
    {
        let out_dir = std::path::Path::new("../frontend/src/bindings");
        router.write_bindings_to_dir(out_dir);
        mail::write_bindings_to_dir(out_dir);
    }
    router
}

#[handler(query)]
async fn data(ctx: AppState<'static>) -> types::Data {
    tracing::debug!("serving data");
    (*ctx.data).clone()
}

// this is here purely to generate ts bindings
#[handler(query)]
async fn render_input(
    _ctx: AppState<'static>,
    input: types::RenderInput,
) -> types::RenderOutput {
    let _ = input;
    types::RenderOutput {
        id: 0,
        status: 0,
        html: None,
        error: None,
        headers: HashMap::new(),
    }
}

#[handler(query)]
async fn experience(ctx: AppState<'static>) -> Vec<types::ExperienceItem> {
    load_experience(&ctx).await
}

/// The handler body, minus the RPC wrapper, so the cache path is reachable from
/// a test without going through qubit or the network.
async fn load_experience(
    ctx: &AppState<'static>,
) -> Vec<types::ExperienceItem> {
    const TTL: Duration = Duration::from_secs(6 * 60 * 60);
    const RETRY_INTERVAL: Duration = Duration::from_secs(60);

    let mut cache = ctx.experience_cache.write().await;
    if let Some(items) = cache.fresh(TTL) {
        tracing::debug!("serving experience from cache");
        return items;
    }

    let items = cache
        .items
        .clone()
        .unwrap_or_else(|| ctx.data.experience_items.clone());
    if cache.refreshing
        || cache
            .refresh_started_at
            .is_some_and(|t| t.elapsed() < RETRY_INTERVAL)
    {
        return items;
    }

    cache.refreshing = true;
    cache.refresh_started_at = Some(Instant::now());
    drop(cache);

    let ctx = ctx.clone();
    let previous = items.clone();
    tokio::spawn(async move {
        let (items, complete) = refresh_experience(&ctx, previous).await;
        let mut cache = ctx.experience_cache.write().await;
        if complete {
            cache.store(items);
        } else {
            cache.items = Some(items);
        }
        cache.refreshing = false;
    });

    items
}

async fn refresh_experience(
    ctx: &AppState<'static>,
    mut items: Vec<types::ExperienceItem>,
) -> (Vec<types::ExperienceItem>, bool) {
    tracing::info!("fetching experience data");
    let client = &ctx.experience_client;

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
            tokio::spawn(fetch_repo_info(
                ctx.github_api_key.clone(),
                client.clone(),
                repo.clone(),
            ))
        })
        .collect();

    let (gruber_dl, repo_info) = tokio::join!(
        fetch_extension_downloads(client, "gruber-darker"),
        async {
            let mut info: HashMap<String, GitHubRepoInfo> = HashMap::new();
            for handle in handles {
                if let Ok((repo, Some(repo_info))) = handle.await {
                    info.insert(repo, repo_info);
                }
            }
            info
        }
    );

    for item in &mut items {
        if let Some(info) = repo_info.get(&item.name) {
            item.stars = info.stargazers_count;
            item.forks = info.forks_count;
        }
        if item.zed_extension_id.as_deref() == Some("gruber-darker") {
            item.downloads = gruber_dl.or(item.downloads);
        }
    }

    let complete = repo_info.len() == unique_repos.len() && gruber_dl.is_some();
    (items, complete)
}

#[derive(Deserialize)]
struct GitHubRepoInfo {
    stargazers_count: i64,
    forks_count: i64,
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

    let response = response
        .error_for_status()
        .map_err(|e| tracing::error!(extension_id, error = %e, "Zed API returned an error"))
        .ok()?;

    let parsed = response
        .json::<ZedExtensionResponse>()
        .await
        .map_err(|e| tracing::error!(extension_id, error = %e, "Failed to deserialize response"))
        .ok()?;

    parsed.data.into_iter().next().map(|e| e.download_count)
}

async fn fetch_repo_info(
    api_key: Arc<String>,
    client: reqwest::Client,
    repo: String,
) -> (String, Option<GitHubRepoInfo>) {
    tracing::trace!(repo = %repo, "fetching repo info");
    let url = format!("https://api.github.com/repos/{}", repo);

    let repo_info = async {
        let mut request = client.get(&url);
        if !api_key.trim().is_empty() {
            request = request.bearer_auth(api_key.as_str());
        }

        let response = request
            .send()
            .await
            .map_err(|e| tracing::error!(repo, error = %e, "Failed to send request"))
            .ok()?;

        let response = response
            .error_for_status()
            .map_err(|e| {
                tracing::error!(repo, error = %e, "GitHub API returned an error")
            })
            .ok()?;

        response
            .json::<GitHubRepoInfo>()
            .await
            .map_err(|e| tracing::error!(repo, error = %e, "Failed to deserialize repo info"))
            .ok()
    }
    .await;

    (repo, repo_info)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        renderer::{RendererClient, test_support::fake_renderer_config},
        state::ExperienceCache,
    };

    async fn test_state() -> AppState<'static> {
        let renderer = RendererClient::new(fake_renderer_config(None))
            .await
            .expect("fake renderer should start; is `deno` on PATH?");

        AppState::for_tests(renderer, "").await
    }

    fn item(name: &str, stars: i64) -> types::ExperienceItem {
        types::ExperienceItem {
            name: name.to_owned(),
            description: String::new(),
            url: String::new(),
            stars,
            forks: 0,
            language: String::new(),
            language_color: String::new(),
            item_type: "repo".to_owned(),
            downloads: None,
            pr_number: None,
            pr_state: None,
            additions: None,
            deletions: None,
            zed_extension_url: None,
            github_url: None,
            featured: None,
            zed_extension_id: None,
        }
    }

    /// A warm cache must short-circuit before the GitHub and Zed calls; if it
    /// ever stops doing so, every page render starts hitting rate limits.
    #[tokio::test]
    async fn experience_is_served_from_cache_without_calling_out() {
        let state = test_state().await;
        {
            let mut cache = state.experience_cache.write().await;
            cache.store(vec![item("cached/repo", 123)]);
        }

        let items = load_experience(&state).await;

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "cached/repo");
        assert_eq!(items[0].stars, 123);
    }

    #[tokio::test]
    async fn experience_rpc_does_not_wait_for_metadata_refresh() {
        use axum::{
            body::{Body, to_bytes},
            http::{Request, StatusCode},
        };
        use tower::ServiceExt;

        for stale in [false, true] {
            let listener =
                tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let proxy = format!("http://{}", listener.local_addr().unwrap());
            let connected = Arc::new(tokio::sync::Notify::new());
            let accepted = connected.clone();
            let proxy_task = tokio::spawn(async move {
                let mut connections = Vec::new();
                while let Ok((stream, _)) = listener.accept().await {
                    connections.push(stream);
                    accepted.notify_one();
                }
            });

            let mut state = test_state().await;
            state.experience_client = reqwest::Client::builder()
                .proxy(reqwest::Proxy::https(&proxy).unwrap())
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap();
            let expected = if stale {
                let items = vec![item("last-good/repo", 987)];
                let mut cache = state.experience_cache.write().await;
                cache.store(items.clone());
                cache.updated_at =
                    Some(Instant::now() - Duration::from_secs(7 * 60 * 60));
                items
            } else {
                state.data.experience_items.clone()
            };
            let (service, _handle) =
                Router::new().handler(experience).to_service(state);
            let app = axum::Router::new().nest_service("/rpc", service);
            let request = Request::post("/rpc")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"experience","params":[]}"#))
                .unwrap();
            let response = tokio::time::timeout(
                Duration::from_millis(500),
                app.oneshot(request),
            )
            .await
            .expect("experience RPC waited for the stalled upstream")
            .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            let bytes =
                to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
            let body: serde_json::Value =
                serde_json::from_slice(&bytes).unwrap();
            assert_eq!(body["result"], serde_json::to_value(expected).unwrap());

            tokio::time::timeout(Duration::from_secs(1), connected.notified())
                .await
                .expect("the refresh must actually reach the stalled upstream");
            proxy_task.abort();
        }
    }

    /// `fetch_repo_info` discards parse failures with `.ok()?`, so a change in
    /// GitHub's response shape would silently zero out every star count.
    #[test]
    fn github_repo_info_reads_stars_and_forks_and_ignores_extra_fields() {
        let parsed: GitHubRepoInfo = serde_json::from_str(
            r#"{"stargazers_count":42,"forks_count":7,"full_name":"a/b"}"#,
        )
        .unwrap();

        assert_eq!(parsed.stargazers_count, 42);
        assert_eq!(parsed.forks_count, 7);
    }

    #[test]
    fn github_repo_info_rejects_a_response_missing_the_counts() {
        assert!(
            serde_json::from_str::<GitHubRepoInfo>(r#"{"full_name":"a/b"}"#)
                .is_err()
        );
    }

    /// Downloads come from the first entry; an empty list means "unknown", and
    /// must not be read as zero downloads.
    #[test]
    fn zed_extension_downloads_come_from_the_first_entry() {
        let parsed: ZedExtensionResponse = serde_json::from_str(
            r#"{"data":[{"download_count":900},{"download_count":1}]}"#,
        )
        .unwrap();

        assert_eq!(
            parsed.data.into_iter().next().map(|e| e.download_count),
            Some(900)
        );

        let empty: ZedExtensionResponse =
            serde_json::from_str(r#"{"data":[]}"#).unwrap();

        assert_eq!(
            empty.data.into_iter().next().map(|e| e.download_count),
            None
        );
    }

    #[tokio::test]
    async fn the_experience_cache_is_empty_before_anything_is_fetched() {
        let state = test_state().await;
        let cache = state.experience_cache.read().await;

        assert!(cache.fresh(Duration::from_secs(60)).is_none());
        assert!(
            ExperienceCache::new()
                .fresh(Duration::from_secs(60))
                .is_none()
        );
    }
}
