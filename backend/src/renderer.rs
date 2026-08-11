use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Stdio,
    sync::atomic::{AtomicBool, AtomicU32, Ordering},
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
    types::{
        Assets, Head, OpenGraph, OpenGraphImage, RenderInput, RenderOutput,
        StructuredData,
    },
    util::{get_env_key, get_env_key_or},
};

/// Public origin used for canonical URLs and social previews. Canonical links
/// must always point at production, so this stays fixed unless `SITE_ORIGIN`
/// overrides it (preview deployments).
const DEFAULT_SITE_ORIGIN: &str = "https://thojensen.com";
const SITE_NAME: &str = "Thomas Jensen";
const OG_LOCALE: &str = "en_US";
const OG_IMAGE_PATH: &str = "/static/images/og-card.png";
const OG_IMAGE_ALT: &str = "Thomas Jensen — systems engineer";
const OG_IMAGE_MIME: &str = "image/png";
const OG_IMAGE_WIDTH: u32 = 1200;
const OG_IMAGE_HEIGHT: u32 = 630;

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

    pub const fn title(self) -> &'static str {
        match self {
            Self::Home => "Thomas Jensen",
            Self::Projects => "Projects — Thomas Jensen",
            Self::Experience => "Experience — Thomas Jensen",
            Self::Contact => "Contact — Thomas Jensen",
            Self::Automata => "Cellular Automata — Thomas Jensen",
        }
    }

    /// `None` keeps the site-wide locale meta description.
    pub const fn description(self) -> Option<&'static str> {
        match self {
            Self::Home => None,
            Self::Projects => Some(
                "Selected open-source and personal work in Rust, systems, and native software.",
            ),
            Self::Experience => Some(
                "Open-source contributions, extensions, and tooling built in Rust and Haskell.",
            ),
            Self::Contact => Some(
                "Get in touch with Thomas Jensen about work, collaboration, or open source.",
            ),
            Self::Automata => Some(
                "An interactive cellular automaton compiled from Haskell to WebAssembly.",
            ),
        }
    }

    pub const fn og_type(self) -> &'static str {
        match self {
            Self::Home => "profile",
            _ => "website",
        }
    }

    pub const fn structured_data(self) -> StructuredData {
        match self {
            Self::Home => StructuredData::Person,
            _ => StructuredData::None,
        }
    }

    /// Canonical URLs always point at the public origin, never at the host the
    /// request happened to arrive on, so proxies and preview hosts cannot
    /// split a page's ranking across duplicate URLs.
    pub fn canonical(self, site_origin: &str) -> String {
        format!("{}{}", site_origin.trim_end_matches('/'), self.path())
    }

    pub fn head(self, site_origin: &str) -> Head {
        Head {
            title: self.title().to_owned(),
            description: self.description().map(str::to_owned),
            canonical: self.canonical(site_origin),
            robots: "index, follow".to_owned(),
            og: OpenGraph {
                og_type: self.og_type().to_owned(),
                site_name: SITE_NAME.to_owned(),
                locale: OG_LOCALE.to_owned(),
                image: OpenGraphImage {
                    url: format!(
                        "{}{OG_IMAGE_PATH}",
                        site_origin.trim_end_matches('/')
                    ),
                    alt: OG_IMAGE_ALT.to_owned(),
                    mime: OG_IMAGE_MIME.to_owned(),
                    width: OG_IMAGE_WIDTH,
                    height: OG_IMAGE_HEIGHT,
                },
            },
            structured_data: self.structured_data(),
        }
    }
}

#[derive(Debug)]
pub struct RendererConfig {
    pub exe: PathBuf,
    pub args: Vec<String>,
    pub origin: String,
    pub site_origin: String,
    pub assets: Assets,
    pub timeout: Duration,
    pub cold_timeout: Duration,
    pub startup_timeout: Duration,
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
            site_origin: get_env_key_or("SITE_ORIGIN", DEFAULT_SITE_ORIGIN),
            assets,
            timeout: Duration::from_secs(5),
            cold_timeout: Duration::from_secs(15),
            startup_timeout: Duration::from_secs(20),
            cache_ttl: Duration::from_secs(60),
        }
    }
}

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

#[derive(Debug)]
pub struct RendererWorker {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
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
            *worker_slot =
                Some(Self::spawn_worker(&self.config, "restart").await?);
        }

        let req = RenderInput {
            id,
            url: route.path().to_owned(),
            rpc_origin: self.config.origin.clone(),
            assets: self.config.assets.clone(),
            head: route.head(&self.config.site_origin),
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

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum RendererStartupMessage {
    Ready,
}

impl RendererWorker {
    async fn wait_until_ready(&mut self) -> Result<()> {
        let mut line = String::new();
        let bytes_read = self
            .stdout
            .read_line(&mut line)
            .await
            .context("failed to read renderer readiness message")?;

        if bytes_read == 0 {
            let status = self
                .child
                .try_wait()
                .context("failed to inspect Deno renderer status")?;
            bail!("Deno renderer exited before becoming ready: {status:?}");
        }

        let message: RendererStartupMessage = serde_json::from_str(&line)
            .context("Deno renderer returned an invalid readiness message")?;

        match message {
            RendererStartupMessage::Ready => Ok(()),
        }
    }

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
