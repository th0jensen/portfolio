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

#[derive(Debug, Deserialize)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use indoc::indoc;

    #[test]
    fn from_path_maps_known_routes_and_rejects_unknown() {
        assert_eq!(RenderRoute::from_path("/"), Some(RenderRoute::Home));
        assert_eq!(
            RenderRoute::from_path("/projects"),
            Some(RenderRoute::Projects)
        );
        assert_eq!(
            RenderRoute::from_path("/experience"),
            Some(RenderRoute::Experience)
        );
        assert_eq!(
            RenderRoute::from_path("/contact"),
            Some(RenderRoute::Contact)
        );
        assert_eq!(
            RenderRoute::from_path("/automata"),
            Some(RenderRoute::Automata)
        );
        assert_eq!(RenderRoute::from_path("/nope"), None);
    }

    #[test]
    fn head_builds_canonical_and_og_image_urls_without_double_slashes() {
        let head = RenderRoute::Contact.head("https://example.com/");

        assert_eq!(head.canonical, "https://example.com/contact");
        assert_eq!(
            head.og.image.url,
            "https://example.com/static/images/og-card.png"
        );
        assert_eq!(head.title, "Contact — Thomas Jensen");
        assert!(head.description.is_some());
    }

    #[test]
    fn home_has_no_meta_description_and_person_structured_data() {
        let head = RenderRoute::Home.head("https://example.com");

        assert_eq!(head.description, None);
        assert!(matches!(head.structured_data, StructuredData::Person));
        assert!(matches!(
            RenderRoute::Contact.structured_data(),
            StructuredData::None
        ));
    }

    #[test]
    fn startup_message_accepts_ready_and_rejects_unknown_tag() {
        let ready: RendererStartupMessage =
            serde_json::from_str(r#"{"type":"ready"}"#).unwrap();
        assert!(matches!(ready, RendererStartupMessage::Ready));

        let error =
            serde_json::from_str::<RendererStartupMessage>(r#"{"type":"nope"}"#)
                .unwrap_err();
        assert!(error.to_string().contains("unknown variant"));
    }

    struct TempDistDir(PathBuf);

    impl TempDistDir {
        fn with_manifest(manifest_json: &str) -> Self {
            let dir = Self::unique_dir();
            fs::create_dir_all(dir.join(".vite")).unwrap();
            fs::write(dir.join(".vite/manifest.json"), manifest_json).unwrap();
            Self(dir)
        }

        fn empty() -> Self {
            let dir = Self::unique_dir();
            fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }

        fn unique_dir() -> PathBuf {
            std::env::temp_dir().join(format!(
                "portfolio-backend-test-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ))
        }
    }

    impl Drop for TempDistDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn load_assets_reads_the_entry_module_from_the_vite_manifest() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index-abc123.js",
                "css": ["assets/index-abc123.css"],
                "isEntry": true
              }
            }
        "#});

        let assets = load_assets(&dist.0).unwrap();

        assert_eq!(assets.js, "assets/index-abc123.js");
        assert_eq!(assets.css, "assets/index-abc123.css");
    }

    #[test]
    fn load_assets_falls_back_to_the_index_html_key_without_is_entry() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index-xyz.js",
                "css": ["assets/index-xyz.css"]
              }
            }
        "#});

        let assets = load_assets(&dist.0).unwrap();

        assert_eq!(assets.js, "assets/index-xyz.js");
    }

    #[test]
    fn load_assets_errors_when_manifest_is_missing() {
        let dist = TempDistDir::empty();

        let error = load_assets(&dist.0).unwrap_err();

        assert!(error.to_string().contains("failed to read"));
    }

    #[test]
    fn load_assets_errors_when_entry_has_no_css() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index.js",
                "css": [],
                "isEntry": true
              }
            }
        "#});

        let error = load_assets(&dist.0).unwrap_err();

        assert!(error.to_string().contains("no CSS asset"));
    }

    // The tests below spawn a real `deno` child process running
    // frontend/src/fake-render-worker.ts and speak the actual stdin/stdout
    // protocol, so they exercise worker startup, the request/response
    // exchange, and failure/restart handling exactly as the real SSR
    // renderer would. They require `deno` on PATH, same as the rest of
    // this project's dev and CI workflows.
    const FAKE_RENDERER_SCRIPT: &str = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../frontend/src/fake-render-worker.ts"
    );

    fn fixture_config(startup_arg: Option<&str>) -> RendererConfig {
        let mut args = vec![
            "run".to_owned(),
            "--no-config".to_owned(),
            FAKE_RENDERER_SCRIPT.to_owned(),
        ];
        args.extend(startup_arg.map(str::to_owned));

        RendererConfig {
            exe: PathBuf::from("deno"),
            args,
            origin: "http://localhost:8080".to_owned(),
            site_origin: "https://example.com".to_owned(),
            assets: Assets {
                css: "assets/index.css".to_owned(),
                js: "assets/index.js".to_owned(),
            },
            timeout: Duration::from_millis(700),
            cold_timeout: Duration::from_secs(3),
            startup_timeout: Duration::from_secs(5),
            cache_ttl: Duration::from_millis(300),
        }
    }

    #[tokio::test]
    async fn a_crashed_worker_is_discarded_and_replaced() {
        let client = RendererClient::new(fixture_config(None)).await.unwrap();

        let error = client.render(RenderRoute::Experience).await.unwrap_err();
        assert!(error.to_string().contains("closed stdout"));

        let output = client.render(RenderRoute::Home).await.unwrap();
        assert_eq!(output.html.as_deref(), Some("<html>/:1</html>"));
    }

    #[tokio::test]
    async fn a_response_id_mismatch_is_an_error() {
        let client = RendererClient::new(fixture_config(None)).await.unwrap();

        let error = client.render(RenderRoute::Contact).await.unwrap_err();

        assert!(error.to_string().contains("ID mismatch"));
    }

    #[tokio::test]
    async fn an_invalid_json_response_is_an_error() {
        let client = RendererClient::new(fixture_config(None)).await.unwrap();

        let error = client.render(RenderRoute::Projects).await.unwrap_err();

        assert!(error.to_string().contains("invalid JSON"));
    }

    #[tokio::test]
    async fn new_fails_when_the_renderer_executable_is_missing() {
        let config = RendererConfig {
            exe: PathBuf::from("/nonexistent/definitely-not-a-renderer"),
            ..fixture_config(None)
        };

        let error = RendererClient::new(config).await.unwrap_err();

        assert!(error.to_string().contains("failed to start"));
    }

    #[tokio::test]
    async fn new_fails_when_the_worker_exits_before_announcing_ready() {
        let error = RendererClient::new(fixture_config(Some("no-ready")))
            .await
            .unwrap_err();

        assert!(error.to_string().contains("exited before becoming ready"));
    }

    #[tokio::test]
    async fn new_fails_when_the_ready_message_is_invalid_json() {
        let error = RendererClient::new(fixture_config(Some("bad-ready")))
            .await
            .unwrap_err();

        assert!(error.to_string().contains("invalid readiness message"));
    }

    #[tokio::test]
    async fn new_fails_when_the_worker_never_announces_ready_in_time() {
        let config = RendererConfig {
            startup_timeout: Duration::from_millis(200),
            ..fixture_config(Some("slow-ready"))
        };

        let error = RendererClient::new(config).await.unwrap_err();

        assert!(error.to_string().contains("failed to become ready"));
    }

    // The tests below exercise the real, compiled SSR renderer
    // (`frontend/dist/renderer`) end to end against a purpose-built qubit
    // RPC stub that we fully control, so failures reflect the actual
    // production render path rather than a scripted imitation of it.
    // Requires `just frontend::build` to have already produced the binary.
    //
    // The binary is `deno compile`d with its outbound network permission
    // locked to exactly 127.0.0.1:8080 (see frontend/deno.json's `build`
    // task), so the stub server must bind that literal address. Both tests
    // below share `REAL_RENDERER_LOCK` so they never fight over that port,
    // but it will still conflict with a `just dev` server already running.
    static REAL_RENDERER_LOCK: tokio::sync::Mutex<()> =
        tokio::sync::Mutex::const_new(());

    #[derive(Clone)]
    struct StubRpcCtx {
        data: std::sync::Arc<crate::types::Data>,
        hang_data: std::sync::Arc<std::sync::atomic::AtomicBool>,
        data_calls: std::sync::Arc<std::sync::atomic::AtomicU32>,
    }

    // Method names are derived from the function identifier by the
    // `handler` macro, and must match what the real render-worker's qubit
    // client calls (`api.data.query()` / `api.experience.query()`).
    #[qubit::handler(query)]
    async fn data(ctx: StubRpcCtx) -> crate::types::Data {
        ctx.data_calls
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        if ctx.hang_data.load(std::sync::atomic::Ordering::SeqCst) {
            std::future::pending::<()>().await;
        }
        (*ctx.data).clone()
    }

    #[qubit::handler(query)]
    async fn experience(ctx: StubRpcCtx) -> Vec<crate::types::ExperienceItem> {
        ctx.data.experience_items.clone()
    }

    struct StubRpcServer {
        hang_data: std::sync::Arc<std::sync::atomic::AtomicBool>,
        data_calls: std::sync::Arc<std::sync::atomic::AtomicU32>,
        handle: qubit::ServerHandle,
        task: tokio::task::JoinHandle<()>,
    }

    impl StubRpcServer {
        async fn spawn() -> Self {
            let hang_data =
                std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
            let data_calls =
                std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0));
            let ctx = StubRpcCtx {
                data: std::sync::Arc::new(crate::types::Data::get()),
                hang_data: hang_data.clone(),
                data_calls: data_calls.clone(),
            };
            let rpc_router = qubit::Router::new().handler(data).handler(experience);
            let (rpc_service, handle) = rpc_router.to_service(ctx);
            let rpc_app = axum::Router::new().nest_service("/rpc", rpc_service);
            let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
                .await
                .expect(
                    "failed to bind 127.0.0.1:8080 for the stub RPC server; is `just dev` already running?",
                );
            let task = tokio::spawn(async move {
                let _ = axum::serve(listener, rpc_app).await;
            });

            Self {
                hang_data,
                data_calls,
                handle,
                task,
            }
        }

        fn set_hang_data(&self, hang: bool) {
            self.hang_data.store(hang, std::sync::atomic::Ordering::SeqCst);
        }

        fn data_call_count(&self) -> u32 {
            self.data_calls.load(std::sync::atomic::Ordering::SeqCst)
        }

        async fn shutdown(self) {
            let _ = self.handle.stop();
            self.task.abort();
        }
    }

    fn real_renderer_paths() -> (PathBuf, PathBuf) {
        let renderer_bin = PathBuf::from(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../frontend/dist/renderer"
        ));
        let dist_dir = PathBuf::from(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../frontend/dist"
        ));

        if !renderer_bin.exists() {
            panic!(
                "compiled renderer not found at {}; run `just frontend::build` first",
                renderer_bin.display()
            );
        }

        (renderer_bin, dist_dir)
    }

    fn real_renderer_config(
        renderer_bin: PathBuf,
        assets: Assets,
        timeout: Duration,
        cold_timeout: Duration,
    ) -> RendererConfig {
        RendererConfig {
            exe: renderer_bin,
            args: Vec::new(),
            origin: "http://127.0.0.1:8080".to_owned(),
            site_origin: "https://example.com".to_owned(),
            assets,
            timeout,
            cold_timeout,
            startup_timeout: Duration::from_secs(10),
            cache_ttl: Duration::from_millis(300),
        }
    }

    #[tokio::test]
    async fn real_renderer_binary_renders_every_route() {
        let _guard = REAL_RENDERER_LOCK.lock().await;
        let (renderer_bin, dist_dir) = real_renderer_paths();
        let assets = load_assets(&dist_dir).expect(
            "failed to read the built Vite manifest; run `just frontend::build` first",
        );

        let server = StubRpcServer::spawn().await;
        let config = real_renderer_config(
            renderer_bin,
            assets,
            Duration::from_secs(5),
            Duration::from_secs(10),
        );
        let client = RendererClient::new(config).await.unwrap();

        let routes = [
            RenderRoute::Home,
            RenderRoute::Projects,
            RenderRoute::Experience,
            RenderRoute::Contact,
            RenderRoute::Automata,
        ];
        let mut home_html = None;
        for route in routes {
            let output = client.render(route).await.unwrap();

            assert!(
                output.error.is_none(),
                "{route:?} returned an error: {:?}",
                output.error
            );
            let html = output.html.expect("renderer returned no html");
            assert!(html.contains("<!doctype html>"), "{route:?} missing doctype");
            assert!(
                html.contains(route.title()),
                "{route:?} missing its <title>"
            );
            assert!(
                html.contains(&route.canonical("https://example.com")),
                "{route:?} missing its canonical link"
            );

            if route == RenderRoute::Home {
                home_html = Some(html);
            }
        }

        // Only Home carries Person structured data (see `structured_data`).
        let home_html = home_html.unwrap();
        assert!(home_html.contains(r#""@type":"Person""#));

        let calls_before_cache_check = server.data_call_count();
        let cached = client.render(RenderRoute::Home).await.unwrap();
        assert_eq!(cached.html.as_deref(), Some(home_html.as_str()));
        assert_eq!(
            server.data_call_count(),
            calls_before_cache_check,
            "a cached render should not re-query the RPC backend"
        );

        server.shutdown().await;
    }

    #[tokio::test]
    async fn real_renderer_worker_times_out_and_is_replaced() {
        let _guard = REAL_RENDERER_LOCK.lock().await;
        let (renderer_bin, dist_dir) = real_renderer_paths();
        let assets = load_assets(&dist_dir).expect(
            "failed to read the built Vite manifest; run `just frontend::build` first",
        );

        let server = StubRpcServer::spawn().await;
        server.set_hang_data(true);

        let config = real_renderer_config(
            renderer_bin,
            assets,
            Duration::from_secs(1),
            Duration::from_secs(1),
        );
        let client = RendererClient::new(config).await.unwrap();

        // The real renderer's RPC call to fetch `data` hangs forever, so the
        // whole render hangs with it; our client-side timeout must fire and
        // kill the stuck process.
        let error = client.render(RenderRoute::Home).await.unwrap_err();
        assert!(error.to_string().contains("timed out"));
        assert_eq!(server.data_call_count(), 1);

        // Unhang the backend and prove a *new* renderer process handles the
        // next request rather than the killed one silently reviving.
        server.set_hang_data(false);
        let output = client.render(RenderRoute::Home).await.unwrap();
        assert!(output.error.is_none());
        assert_eq!(server.data_call_count(), 2);

        server.shutdown().await;
    }
}
