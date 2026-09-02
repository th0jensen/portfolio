use anyhow::{Context, Result, bail};
use axum_prometheus::metrics::counter;
use serde::Deserialize;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout},
};

use crate::types::{RenderInput, RenderOutput};

#[derive(Debug)]
pub struct RendererWorker {
    pub(super) child: Child,
    pub(super) stdin: ChildStdin,
    pub(super) stdout: BufReader<ChildStdout>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum RendererStartupMessage {
    Ready,
}

impl RendererWorker {
    pub(super) async fn wait_until_ready(&mut self) -> Result<()> {
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

    pub(super) async fn exchange(
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

pub(super) async fn discard_worker(
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn startup_message_accepts_ready_and_rejects_unknown_tag() {
        let ready: RendererStartupMessage =
            serde_json::from_str(r#"{"type":"ready"}"#).unwrap();
        assert!(matches!(ready, RendererStartupMessage::Ready));

        let error = serde_json::from_str::<RendererStartupMessage>(
            r#"{"type":"nope"}"#,
        )
        .unwrap_err();
        assert!(error.to_string().contains("unknown variant"));
    }
}
