use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Stdio,
    sync::atomic::{AtomicU32, Ordering},
    time::Duration,
};

use anyhow::{Context, Result, bail};
use axum_prometheus::metrics::{counter, histogram};
use serde::Deserialize;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout, Command},
    sync::{Mutex, RwLock},
    time::{Instant, timeout},
};

use crate::{
    types::{Assets, RenderInput, RenderOutput},
    util::get_env_key,
};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum RenderRoute {
    Home,
    Projects,
    Experience,
    Contact,
    Automata,
}

impl RenderRoute {
    pub fn from_path(path: &str) -> Option<Self> {
        match path {
            "/" => Some(Self::Home),
            "/projects" => Some(Self::Projects),
            "/experience" => Some(Self::Experience),
            "/contact" => Some(Self::Contact),
            "/automata" => Some(Self::Automata),
            _ => None,
        }
    }

    pub const fn path(self) -> &'static str {
        match self {
            Self::Home => "/",
            Self::Projects => "/projects",
            Self::Experience => "/experience",
            Self::Contact => "/contact",
            Self::Automata => "/automata",
        }
    }
}

#[derive(Debug)]
pub struct RendererConfig {
    pub exe: PathBuf,
    pub args: Vec<String>,
    pub origin: String,
    pub assets: Assets,
    pub timeout: Duration,
    pub cache_ttl: Duration,
}

impl RendererConfig {
    pub fn new() -> Self {
        let assets = load_assets(Path::new(&get_env_key("DIST_DIR"))).unwrap_or_else(|e| {
            panic!(
                "failed to load frontend assets from Vite manifest; run `deno task build` in frontend first: {e:#}"
            )
        });

        Self {
            exe: PathBuf::from(get_env_key("RENDERER_BIN")),
            args: Vec::new(),
            origin: get_env_key("AXUM_ORIGIN"),
            assets,
            timeout: Duration::from_secs(5),
            cache_ttl: Duration::from_secs(60),
        }
    }
}

#[derive(Debug)]
pub struct RendererClient {
    config: RendererConfig,
    next_id: AtomicU32,
    worker: Mutex<Option<RendererWorker>>,
    cache: RwLock<HashMap<RenderRoute, CacheEntry>>,
}

#[derive(Clone, Debug)]
struct CacheEntry {
    inserted_at: Instant,
    output: RenderOutput,
}

#[derive(Debug)]
pub struct RendererWorker {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl RendererClient {
    pub fn new(config: RendererConfig) -> Result<Self> {
        let worker = Self::spawn_worker(&config, "startup")?;

        Ok(Self {
            config,
            next_id: AtomicU32::new(1),
            worker: Mutex::new(Some(worker)),
            cache: RwLock::new(HashMap::with_capacity(5)),
        })
    }

    pub async fn render(&self, route: RenderRoute) -> Result<RenderOutput> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);

        if let Some(output) = self.cached(route, id).await {
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

        let started = Instant::now();
        let lock_started = Instant::now();
        let mut worker_slot = timeout(self.config.timeout, self.worker.lock())
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

        if let Some(output) = self.cached(route, id).await {
            counter!(
                "portfolio_ssr_cache_requests_total",
                "result" => "coalesced",
                "route" => route.path()
            )
            .increment(1);
            return Ok(output);
        }

        if worker_slot.is_none() {
            *worker_slot = Some(Self::spawn_worker(&self.config, "restart")?);
        }

        let req = RenderInput {
            id,
            url: route.path().to_owned(),
            rpc_origin: self.config.origin.clone(),
            assets: self.config.assets.clone(),
        };
        let exchange_started = Instant::now();
        let res = {
            let worker = worker_slot
                .as_mut()
                .expect("renderer worker unexpectedly missing");

            let remaining =
                self.config.timeout.saturating_sub(started.elapsed());
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
                histogram!(
                    "portfolio_ssr_exchange_duration_seconds",
                    "result" => "timeout",
                    "route" => route.path()
                )
                .record(exchange_started.elapsed().as_secs_f64());
                discard_worker(&mut worker_slot, "timeout").await;
                bail!("renderer timed out after {:?}", self.config.timeout);
            }
        };

        if out.id != id {
            discard_worker(&mut worker_slot, "id_mismatch").await;
            bail!(
                "renderer response ID mismatch: expected {id}, got {}",
                out.id
            );
        }

        if out.error.is_none()
            && out.html.is_some()
            && (200..300).contains(&out.status)
        {
            self.cache.write().await.insert(
                route,
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
        route: RenderRoute,
        request_id: u32,
    ) -> Option<RenderOutput> {
        let mut output = {
            let cache = self.cache.read().await;
            let entry = cache.get(&route)?;
            if entry.inserted_at.elapsed() >= self.config.cache_ttl {
                return None;
            }
            entry.output.clone()
        };
        output.id = request_id;
        Some(output)
    }

    fn spawn_worker(
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
        tracing::info!(exe = ?config.exe, reason, "started SSR renderer process");

        let stdin = child
            .stdin
            .take()
            .context("Deno renderer stdin was not piped")?;

        let stdout = child
            .stdout
            .take()
            .context("Deno renderer stdout was not piped")?;

        Ok(RendererWorker {
            child,
            stdin,
            stdout: BufReader::new(stdout),
        })
    }
}

impl RendererWorker {
    async fn exchange(
        &mut self,
        request: &RenderInput,
    ) -> Result<RenderOutput> {
        let mut message = serde_json::to_vec(request)
            .context("failed to serialize render request")?;

        message.push(b'\n');

        self.stdin
            .write_all(&message)
            .await
            .context("failed to write to Deno renderer")?;

        self.stdin
            .flush()
            .await
            .context("failed to flush Deno renderer stdin")?;

        let mut line = String::new();

        let bytes_read = self
            .stdout
            .read_line(&mut line)
            .await
            .context("failed to read from Deno renderer")?;

        if bytes_read == 0 {
            let status = self
                .child
                .try_wait()
                .context("failed to inspect Deno renderer status")?;

            bail!("Deno renderer closed stdout; status: {status:?}");
        }

        serde_json::from_str(&line)
            .context("Deno renderer returned invalid JSON")
    }
}

async fn discard_worker(
    worker_slot: &mut Option<RendererWorker>,
    reason: &'static str,
) {
    if let Some(mut worker) = worker_slot.take() {
        counter!("portfolio_ssr_worker_discards_total", "reason" => reason)
            .increment(1);
        let _ = worker.child.kill().await;
        let _ = worker.child.wait().await;
    }
}

#[derive(Deserialize)]
struct ManifestEntry {
    file: String,
    #[serde(default)]
    css: Vec<String>,
    #[serde(default, rename = "isEntry")]
    is_entry: bool,
}

pub fn load_assets(dist_dir: &Path) -> Result<Assets> {
    let manifest_path = dist_dir.join(".vite/manifest.json");
    let manifest = fs::read_to_string(&manifest_path).with_context(|| {
        format!("failed to read {}", manifest_path.display())
    })?;
    let entries: HashMap<String, ManifestEntry> =
        serde_json::from_str(&manifest).context("invalid Vite manifest")?;

    let entry = entries
        .iter()
        .find(|(name, entry)| entry.is_entry || name.as_str() == "index.html")
        .map(|(_, entry)| entry)
        .context("Vite manifest has no entry module")?;
    let css = entry
        .css
        .first()
        .cloned()
        .context("Vite entry has no CSS asset")?;

    Ok(Assets {
        css,
        js: entry.file.clone(),
    })
}
