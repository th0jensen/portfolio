use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Stdio,
    sync::atomic::{AtomicU32, Ordering},
    time::Duration,
};

use anyhow::{Context, Result, bail};
use serde::Deserialize;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout, Command},
    sync::Mutex,
    time::{Instant, timeout},
};

use crate::{
    types::{Assets, RenderInput, RenderOutput},
    util::get_env_key,
};

#[derive(Debug)]
pub struct RendererConfig {
    pub exe: PathBuf,
    pub args: Vec<String>,
    pub origin: String,
    pub assets: Assets,
    pub timeout: Duration,
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
        }
    }
}

#[derive(Debug)]
pub struct RendererClient {
    config: RendererConfig,
    next_id: AtomicU32,
    worker: Mutex<Option<RendererWorker>>,
}

#[derive(Debug)]
pub struct RendererWorker {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl RendererClient {
    pub fn new(cfg: RendererConfig) -> Self {
        Self {
            config: cfg,
            next_id: AtomicU32::new(1),
            worker: Mutex::new(None),
        }
    }

    pub async fn render(&self, url: &str) -> Result<RenderOutput> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);

        let req = RenderInput {
            id,
            url: url.to_owned(),
            rpc_origin: self.config.origin.clone(),
            assets: self.config.assets.clone(),
        };

        let started = Instant::now();
        let mut worker_slot = timeout(self.config.timeout, self.worker.lock())
            .await
            .context("timed out waiting for the renderer worker")?;
        if worker_slot.is_none() {
            *worker_slot = Some(self.spawn_worker()?);
        }

        let res = {
            let worker = worker_slot
                .as_mut()
                .expect("renderer worker unexpectedly missing");

            let remaining =
                self.config.timeout.saturating_sub(started.elapsed());
            timeout(remaining, worker.exchange(&req)).await
        };

        let out = match res {
            Ok(Ok(out)) => out,
            Ok(Err(err)) => {
                discard_worker(&mut worker_slot).await;
                return Err(err);
            }
            Err(_) => {
                discard_worker(&mut worker_slot).await;
                bail!("renderer timed out after {:?}", self.config.timeout);
            }
        };

        if out.id != id {
            discard_worker(&mut worker_slot).await;
            bail!(
                "renderer response ID mismatch: expected {id}, got {}",
                out.id
            );
        }

        Ok(out)
    }

    fn spawn_worker(&self) -> Result<RendererWorker> {
        let mut command = Command::new(&self.config.exe);

        command
            .args(&self.config.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .kill_on_drop(true);

        let mut child =
            command.spawn().context("failed to start Deno renderer")?;

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

async fn discard_worker(worker_slot: &mut Option<RendererWorker>) {
    if let Some(mut worker) = worker_slot.take() {
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
