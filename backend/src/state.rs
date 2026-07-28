use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use anyhow::{Context, Result};
use aws_config::{BehaviorVersion, Region, defaults};
use aws_sdk_s3::{Client, config::Credentials};
use axum::extract::State;
use axum_prometheus::{
    GenericMetricLayer, Handle, PrometheusMetricLayer,
    metrics_exporter_prometheus::PrometheusHandle,
};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use derivative::Derivative;

use http::{HeaderValue, header};
use resend_rs::Resend;
use tokio::sync::RwLock;
use tower::{
    ServiceBuilder,
    layer::util::{Identity, Stack},
};
use tower_http::{
    compression::CompressionLayer, set_header::SetResponseHeaderLayer,
};
use tracing_subscriber::EnvFilter;

use crate::{
    renderer::{RendererClient, RendererConfig},
    types::{Data, ExperienceItem},
    util::get_env_key,
};

#[derive(Clone, Debug)]
pub(crate) struct ExperienceCache(Option<(Instant, Vec<ExperienceItem>)>);

impl ExperienceCache {
    pub(crate) fn new() -> Self {
        Self(None)
    }

    pub(crate) fn fresh(&self, ttl: Duration) -> Option<Vec<ExperienceItem>> {
        match &self.0 {
            Some((t, items)) if t.elapsed() < ttl => Some(items.clone()),
            _ => None,
        }
    }

    pub(crate) fn store(&mut self, items: Vec<ExperienceItem>) {
        self.0 = Some((Instant::now(), items))
    }
}

type PrometheusLayer<'a> = GenericMetricLayer<'a, PrometheusHandle, Handle>;

#[derive(Derivative, Clone)]
#[derivative(Debug)]
pub(crate) struct AppState<'a> {
    pub(crate) renderer: Arc<RendererClient>,
    pub(crate) s3: Arc<Client>,
    pub(crate) bucket: Arc<String>,
    pub(crate) resend_client: Arc<Resend>,
    pub(crate) experience_cache: Arc<RwLock<ExperienceCache>>,
    pub(crate) github_api_key: Arc<String>,
    pub(crate) contact_mail: Arc<String>,
    pub(crate) sender_mail: Arc<String>,
    pub(crate) data: Arc<Data>,
    #[derivative(Debug = "ignore")]
    pub(crate) font_css: Arc<String>,
    pub(crate) dist_dir: Arc<String>,
    pub(crate) static_dir: Arc<String>,
    #[derivative(Debug = "ignore")]
    pub(crate) prometheus_layer: Arc<PrometheusLayer<'a>>,
    pub(crate) metric_handle: Arc<PrometheusHandle>,
}

impl<'a> AppState<'a> {
    pub(crate) async fn new() -> Self {
        let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
        let s3 = Arc::new(Self::create_s3_client().await);
        let bucket = Arc::new(get_env_key("BUCKET_NAME"));
        let font_css = Self::load_font_css(s3.as_ref(), bucket.as_ref())
            .await
            .unwrap_or_else(|error| {
                panic!("failed to embed fonts from S3: {error:#}")
            });

        Self {
            s3,
            bucket,
            renderer: Arc::new(RendererClient::new(RendererConfig::new())),
            resend_client: Arc::new(Self::create_resend_client()),
            experience_cache: Arc::new(RwLock::new(ExperienceCache::new())),
            github_api_key: Arc::new(get_env_key("GITHUB_API_KEY")),
            contact_mail: Arc::new(get_env_key("CONTACT_MAIL")),
            sender_mail: Arc::new(get_env_key("SENDER_MAIL")),
            data: Arc::new(Data::get()),
            font_css: Arc::new(font_css),
            dist_dir: Arc::new(get_env_key("DIST_DIR")),
            static_dir: Arc::new(get_env_key("STATIC_DIR")),
            prometheus_layer: Arc::new(prometheus_layer),
            metric_handle: Arc::new(metric_handle.clone()),
        }
    }

    fn create_resend_client() -> Resend {
        Resend::new(&get_env_key("RESEND_API_KEY"))
    }

    async fn load_font_css(client: &Client, bucket: &str) -> Result<String> {
        let (regular, bold) = tokio::try_join!(
            Self::load_font(client, bucket, "fonts/alef-400.ttf"),
            Self::load_font(client, bucket, "fonts/alef-700.ttf"),
        )?;

        Ok(format!(
            "<style>@font-face{{font-family:'Alef';src:url('data:font/ttf;base64,{regular}') format('truetype');font-weight:400;font-style:normal;font-display:swap}}@font-face{{font-family:'Alef';src:url('data:font/ttf;base64,{bold}') format('truetype');font-weight:700;font-style:normal;font-display:swap}}</style>"
        ))
    }

    async fn load_font(
        client: &Client,
        bucket: &str,
        key: &str,
    ) -> Result<String> {
        let object = client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("failed to fetch {key}"))?;
        let bytes = object
            .body
            .collect()
            .await
            .with_context(|| format!("failed to read {key}"))?
            .into_bytes();

        Ok(STANDARD.encode(bytes))
    }

    async fn create_s3_client() -> Client {
        let (access_key, secret) = (
            get_env_key("AWS_ACCESS_KEY_ID"),
            get_env_key("AWS_SECRET_ACCESS_KEY"),
        );
        let creds = Credentials::new(access_key, secret, None, None, "Tigris");
        Client::new(
            &defaults(BehaviorVersion::latest())
                .credentials_provider(creds)
                .region(Region::new("auto"))
                .endpoint_url("https://fly.storage.tigris.dev")
                .load()
                .await,
        )
    }
}

pub fn env_filter() -> impl Into<EnvFilter> {
    EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new("backend=info,tower_http=warn,axum=warn")
    })
}

pub async fn metrics_handler(State(state): State<AppState<'static>>) -> String {
    state.metric_handle.render()
}

pub type Headers = Stack<
    SetResponseHeaderLayer<HeaderValue>,
    Stack<CompressionLayer, Identity>,
>;

pub fn headers() -> ServiceBuilder<Headers> {
    ServiceBuilder::new()
        .layer(
            CompressionLayer::new()
                .gzip(true)
                .br(true)
                .deflate(true)
                .zstd(true),
        )
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-cache"),
        ))
}
