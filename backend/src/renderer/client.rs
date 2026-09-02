use std::{
    collections::HashMap,
    process::Stdio,
    sync::atomic::{AtomicBool, AtomicU32, Ordering},
    time::Duration,
};

use anyhow::{Context, Result, bail};
use axum_prometheus::metrics::{counter, histogram};
use tokio::{
    io::BufReader,
    process::Command,
    sync::{Mutex, RwLock},
    time::{Instant, timeout},
};

use crate::types::{RenderInput, RenderOutput};

use super::{
    config::RendererConfig,
    route::RenderRoute,
    worker::{RendererWorker, discard_worker},
};

#[derive(Debug)]
pub struct RendererClient {
    config: RendererConfig,
    next_id: AtomicU32,
    warmed: AtomicBool,
    worker: Mutex<Option<RendererWorker>>,
    cache: RwLock<HashMap<RenderRoute, CacheEntry>>,
}

#[derive(Clone, Debug)]
struct CacheEntry {
    inserted_at: Instant,
    output: RenderOutput,
}

impl RendererClient {
    pub async fn new(config: RendererConfig) -> Result<Self> {
        let worker = Self::spawn_worker(&config, "startup").await?;

        Ok(Self {
            config,
            next_id: AtomicU32::new(1),
            warmed: AtomicBool::new(false),
            worker: Mutex::new(Some(worker)),
            cache: RwLock::new(HashMap::with_capacity(5)),
        })
    }

    pub async fn render(&self, route: RenderRoute) -> Result<RenderOutput> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);

        if let Some(output) = self.cached(&route, id).await {
            counter!(
                "portfolio_ssr_cache_requests_total",
                "result" => "hit",
                "route" => route.path()
            )
            .increment(1);
            return Ok(output);
        }

        counter!(
            "portfolio_ssr_cache_requests_total",
            "result" => "miss",
            "route" => route.path()
        )
        .increment(1);

        let cold = !self.warmed.load(Ordering::Acquire);
        let render_timeout = if cold {
            self.config.cold_timeout
        } else {
            self.config.timeout
        };
        let started = Instant::now();
        let lock_started = Instant::now();
        let mut worker_slot = timeout(render_timeout, self.worker.lock())
            .await
            .context("timed out waiting for the renderer worker")?;
        let lock_wait = lock_started.elapsed();
        histogram!(
            "portfolio_ssr_renderer_lock_wait_duration_seconds",
            "route" => route.path()
        )
        .record(lock_wait.as_secs_f64());

        if lock_wait > Duration::from_millis(250) {
            tracing::warn!(
                route = route.path(),
                wait_ms = lock_wait.as_secs_f64() * 1000.0,
                "waited for SSR renderer"
            );
        }

        if let Some(output) = self.cached(&route, id).await {
            counter!(
                "portfolio_ssr_cache_requests_total",
                "result" => "coalesced",
                "route" => route.path()
            )
            .increment(1);
            return Ok(output);
        }

        if worker_slot.is_none() {
            *worker_slot =
                Some(Self::spawn_worker(&self.config, "restart").await?);
        }

        let req = RenderInput {
            id,
            url: route.path(),
            rpc_origin: self.config.origin.clone(),
            assets: self.config.assets.clone(),
            head: route.head(&self.config.site_origin, &self.config.data),
        };
        let exchange_started = Instant::now();
        let res = {
            let worker = worker_slot
                .as_mut()
                .expect("renderer worker unexpectedly missing");

            let remaining = render_timeout.saturating_sub(started.elapsed());
            timeout(remaining, worker.exchange(&req)).await
        };

        let out = match res {
            Ok(Ok(out)) => {
                histogram!(
                    "portfolio_ssr_exchange_duration_seconds",
                    "result" => "ok",
                    "route" => route.path()
                )
                .record(exchange_started.elapsed().as_secs_f64());
                out
            }
            Ok(Err(err)) => {
                self.warmed.store(false, Ordering::Release);
                histogram!(
                    "portfolio_ssr_exchange_duration_seconds",
                    "result" => "error",
                    "route" => route.path()
                )
                .record(exchange_started.elapsed().as_secs_f64());
                discard_worker(&mut worker_slot, "io_error").await;
                return Err(err);
            }
            Err(_) => {
                self.warmed.store(false, Ordering::Release);
                histogram!(
                    "portfolio_ssr_exchange_duration_seconds",
                    "result" => "timeout",
                    "route" => route.path()
                )
                .record(exchange_started.elapsed().as_secs_f64());
                discard_worker(&mut worker_slot, "timeout").await;
                bail!("renderer timed out after {render_timeout:?}");
            }
        };

        if out.id != id {
            self.warmed.store(false, Ordering::Release);
            discard_worker(&mut worker_slot, "id_mismatch").await;
            bail!(
                "renderer response ID mismatch: expected {id}, got {}",
                out.id
            );
        }

        self.warmed.store(true, Ordering::Release);

        if out.error.is_none()
            && out.html.is_some()
            && (200..300).contains(&out.status)
        {
            self.cache.write().await.insert(
                route.clone(),
                CacheEntry {
                    inserted_at: Instant::now(),
                    output: out.clone(),
                },
            );
        }

        Ok(out)
    }

    async fn cached(
        &self,
        route: &RenderRoute,
        request_id: u32,
    ) -> Option<RenderOutput> {
        let mut output = {
            let cache = self.cache.read().await;
            let entry = cache.get(route)?;
            if entry.inserted_at.elapsed() >= self.config.cache_ttl {
                return None;
            }
            entry.output.clone()
        };
        output.id = request_id;
        Some(output)
    }

    async fn spawn_worker(
        config: &RendererConfig,
        reason: &'static str,
    ) -> Result<RendererWorker> {
        let mut command = Command::new(&config.exe);

        command
            .args(&config.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .kill_on_drop(true);

        let mut child =
            command.spawn().context("failed to start Deno renderer")?;
        counter!("portfolio_ssr_worker_starts_total", "reason" => reason)
            .increment(1);
        tracing::info!(exe = ?config.exe, reason, "spawned SSR renderer process");

        let stdin = child
            .stdin
            .take()
            .context("Deno renderer stdin was not piped")?;

        let stdout = child
            .stdout
            .take()
            .context("Deno renderer stdout was not piped")?;

        let mut worker = RendererWorker {
            child,
            stdin,
            stdout: BufReader::new(stdout),
        };
        let started = Instant::now();

        match timeout(config.startup_timeout, worker.wait_until_ready()).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                let _ = worker.child.kill().await;
                let _ = worker.child.wait().await;
                return Err(error);
            }
            Err(_) => {
                let _ = worker.child.kill().await;
                let _ = worker.child.wait().await;
                bail!(
                    "renderer failed to become ready within {:?}",
                    config.startup_timeout
                );
            }
        }

        histogram!(
            "portfolio_ssr_worker_startup_duration_seconds",
            "reason" => reason
        )
        .record(started.elapsed().as_secs_f64());
        tracing::info!(
            exe = ?config.exe,
            reason,
            startup_ms = started.elapsed().as_secs_f64() * 1000.0,
            "SSR renderer is ready"
        );

        Ok(worker)
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::renderer::test_support::fake_renderer_config;

    // The tests below spawn a real `deno` child process running
    // frontend/src/fake-render-worker.ts and speak the actual stdin/stdout
    // protocol, so they exercise worker startup, the request/response
    // exchange, and failure/restart handling exactly as the real SSR
    // renderer would. They require `deno` on PATH, same as the rest of
    // this project's dev and CI workflows.
    #[tokio::test]
    async fn a_crashed_worker_is_discarded_and_replaced() {
        let client = RendererClient::new(fake_renderer_config(None))
            .await
            .unwrap();

        let error = client.render(RenderRoute::Experience).await.unwrap_err();
        assert!(error.to_string().contains("closed stdout"));

        let output = client.render(RenderRoute::Home).await.unwrap();
        assert_eq!(output.html.as_deref(), Some("<html>/:1</html>"));
    }

    #[tokio::test]
    async fn a_response_id_mismatch_is_an_error() {
        let client = RendererClient::new(fake_renderer_config(None))
            .await
            .unwrap();

        let error = client.render(RenderRoute::Contact).await.unwrap_err();

        assert!(error.to_string().contains("ID mismatch"));
    }

    #[tokio::test]
    async fn an_invalid_json_response_is_an_error() {
        let client = RendererClient::new(fake_renderer_config(None))
            .await
            .unwrap();

        let error = client.render(RenderRoute::Projects).await.unwrap_err();

        assert!(error.to_string().contains("invalid JSON"));
    }

    #[tokio::test]
    async fn new_fails_when_the_renderer_executable_is_missing() {
        let config = RendererConfig {
            exe: PathBuf::from("/nonexistent/definitely-not-a-renderer"),
            ..fake_renderer_config(None)
        };

        let error = RendererClient::new(config).await.unwrap_err();

        assert!(error.to_string().contains("failed to start"));
    }

    #[tokio::test]
    async fn new_fails_when_the_worker_exits_before_announcing_ready() {
        let error = RendererClient::new(fake_renderer_config(Some("no-ready")))
            .await
            .unwrap_err();

        assert!(error.to_string().contains("exited before becoming ready"));
    }

    #[tokio::test]
    async fn new_fails_when_the_ready_message_is_invalid_json() {
        let error =
            RendererClient::new(fake_renderer_config(Some("bad-ready")))
                .await
                .unwrap_err();

        assert!(error.to_string().contains("invalid readiness message"));
    }

    #[tokio::test]
    async fn new_fails_when_the_worker_never_announces_ready_in_time() {
        let config = RendererConfig {
            startup_timeout: Duration::from_millis(200),
            ..fake_renderer_config(Some("slow-ready"))
        };

        let error = RendererClient::new(config).await.unwrap_err();

        assert!(error.to_string().contains("failed to become ready"));
    }
}
