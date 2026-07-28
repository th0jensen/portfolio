use std::{
    collections::HashMap,
    env,
    sync::Arc,
    time::{Duration, Instant},
};

use aws_config::{BehaviorVersion, Region, defaults};
use aws_sdk_s3::{Client, config::Credentials};
use axum::extract::State;
use axum_prometheus::{
    GenericMetricLayer, Handle, PrometheusMetricLayer,
    metrics_exporter_prometheus::PrometheusHandle,
};
use derivative::Derivative;
use futures::future::join_all;
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
    ENDPOINTS,
    types::{Data, ExperienceItem},
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
    pub(crate) s3: Arc<Client>,
    pub(crate) bucket: Arc<String>,
    pub(crate) resend_client: Arc<Resend>,
    pub(crate) page_store: Arc<PageStore>,
    pub(crate) experience_cache: Arc<RwLock<ExperienceCache>>,
    pub(crate) github_api_key: Arc<String>,
    pub(crate) contact_mail: Arc<String>,
    pub(crate) sender_mail: Arc<String>,
    pub(crate) data: Arc<Data>,
    pub(crate) dist_dir: Arc<String>,
    pub(crate) static_dir: Arc<String>,
    #[derivative(Debug = "ignore")]
    pub(crate) prometheus_layer: Arc<PrometheusLayer<'a>>,
    pub(crate) metric_handle: Arc<PrometheusHandle>,
}

impl<'a> AppState<'a> {
    pub(crate) async fn new() -> Self {
        let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
        Self {
            s3: Arc::new(Self::create_s3_client().await),
            bucket: Arc::new(Self::get_env_key("BUCKET_NAME")),
            resend_client: Arc::new(Self::create_resend_client()),
            page_store: Arc::new(PageStore::new().await),
            experience_cache: Arc::new(RwLock::new(ExperienceCache::new())),
            github_api_key: Arc::new(Self::get_env_key("GITHUB_API_KEY")),
            contact_mail: Arc::new(Self::get_env_key("CONTACT_MAIL")),
            sender_mail: Arc::new(Self::get_env_key("SENDER_MAIL")),
            data: Arc::new(Data::get()),
            dist_dir: Arc::new(Self::get_env_key("DIST_DIR")),
            static_dir: Arc::new(Self::get_env_key("STATIC_DIR")),
            prometheus_layer: Arc::new(prometheus_layer),
            metric_handle: Arc::new(metric_handle.clone()),
        }
    }

    fn get_env_key(key: &str) -> String {
        let msg = format!("Missing {}", key);
        env::var(key).expect(&msg)
    }

    fn create_resend_client() -> Resend {
        Resend::new(&Self::get_env_key("RESEND_API_KEY"))
    }

    async fn create_s3_client() -> Client {
        let (access_key, secret) = (
            Self::get_env_key("AWS_ACCESS_KEY_ID"),
            Self::get_env_key("AWS_SECRET_ACCESS_KEY"),
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

#[derive(Clone, Debug)]
pub(crate) struct PageStore {
    pub pages: HashMap<String, String>,
}

impl PageStore {
    async fn new() -> Self {
        join_all(ENDPOINTS.iter().map(|e|
            async move {
                let path = e.trim_start_matches('/');
                let key = if path.is_empty() { "index" } else { path };
                let dist_dir = AppState::get_env_key("DIST_DIR");
                let file_path = format!("{}/{}.html", dist_dir, key);
                match tokio::fs::read_to_string(&file_path).await {
                    Ok(html) => (key.to_owned(), html),
                    Err(e) => {
                        tracing::warn!(path = %file_path, error = %e, "failed to load page");
                        (key.to_owned(), String::new())
                    }
                }
            }
        ))
        .await
        .into_iter()
        .collect::<PageStore>()
    }
}

impl FromIterator<(String, String)> for PageStore {
    fn from_iter<I: IntoIterator<Item = (String, String)>>(iter: I) -> Self {
        PageStore {
            pages: iter.into_iter().collect(),
        }
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
