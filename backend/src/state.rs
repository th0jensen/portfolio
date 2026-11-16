use std::{
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
pub(crate) struct ExperienceCache {
    pub(crate) items: Option<Vec<ExperienceItem>>,
    pub(crate) updated_at: Option<Instant>,
    pub(crate) refresh_started_at: Option<Instant>,
    pub(crate) refreshing: bool,
}

impl ExperienceCache {
    pub(crate) fn new() -> Self {
        Self {
            items: None,
            updated_at: None,
            refresh_started_at: None,
            refreshing: false,
        }
    }

    pub(crate) fn fresh(&self, ttl: Duration) -> Option<Vec<ExperienceItem>> {
        if self.updated_at.is_some_and(|t| t.elapsed() < ttl) {
            self.items.clone()
        } else {
            None
        }
    }

    pub(crate) fn store(&mut self, items: Vec<ExperienceItem>) {
        self.items = Some(items);
        self.updated_at = Some(Instant::now());
    }
}

type PrometheusLayer<'a> = GenericMetricLayer<'a, PrometheusHandle, Handle>;

#[derive(Derivative, Clone)]
#[derivative(Debug)]
pub struct AppState<'a> {
    pub(crate) renderer: Arc<RendererClient>,
    pub(crate) s3: Arc<Client>,
    pub(crate) bucket: Arc<String>,
    pub(crate) resend_client: Arc<Resend>,
    pub(crate) experience_cache: Arc<RwLock<ExperienceCache>>,
    pub(crate) experience_client: reqwest::Client,
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

        Self {
            s3,
            bucket,
            renderer: Arc::new(
                RendererClient::new(RendererConfig::new())
                    .await
                    .unwrap_or_else(|error| {
                        panic!("failed to start SSR renderer: {error:#}")
                    }),
            ),
            resend_client: Arc::new(Self::create_resend_client()),
            experience_cache: Arc::new(RwLock::new(ExperienceCache::new())),
            experience_client: Self::create_experience_client(),
            github_api_key: Arc::new(get_env_key("GITHUB_API_KEY")),
            contact_mail: Arc::new(get_env_key("CONTACT_MAIL")),
            sender_mail: Arc::new(get_env_key("SENDER_MAIL")),
            data: Arc::new(Data::get()),
            font_css: Arc::new(Self::font_css()),
            dist_dir: Arc::new(get_env_key("DIST_DIR")),
            static_dir: Arc::new(get_env_key("STATIC_DIR")),
            prometheus_layer: Arc::new(prometheus_layer),
            metric_handle: Arc::new(metric_handle.clone()),
        }
    }

    fn create_resend_client() -> Resend {
        Resend::new(&get_env_key("RESEND_API_KEY"))
    }

    fn font_css() -> String {
        let regular =
            STANDARD.encode(include_bytes!("../static/fonts/alef-400.woff2"));
        let bold =
            STANDARD.encode(include_bytes!("../static/fonts/alef-700.woff2"));

        format!(
            "<style>@font-face{{font-family:'Alef';src:url('data:font/woff2;base64,{regular}') format('woff2');font-weight:400;font-style:normal;font-display:swap}}@font-face{{font-family:'Alef';src:url('data:font/woff2;base64,{bold}') format('woff2');font-weight:700;font-style:normal;font-display:swap}}</style>"
        )
    }

    fn create_experience_client() -> reqwest::Client {
        reqwest::Client::builder()
            .user_agent("portfolio-backend")
            .connect_timeout(Duration::from_millis(500))
            .timeout(Duration::from_secs(2))
            .build()
            .expect("failed to build experience HTTP client")
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

#[cfg(test)]
impl AppState<'static> {
    /// Builds a state around `renderer` for tests of the HTTP layer.
    ///
    /// The S3 and Resend clients are constructed but pointed nowhere: the page
    /// routes never touch them, and a test that does would fail loudly on
    /// connect rather than quietly reaching a real bucket.
    pub(crate) async fn for_tests(
        renderer: RendererClient,
        font_css: &str,
    ) -> Self {
        // `pair()` installs a process-global recorder, so every test in this
        // binary has to share one.
        static METRICS: std::sync::OnceLock<(
            Arc<PrometheusLayer<'static>>,
            Arc<PrometheusHandle>,
        )> = std::sync::OnceLock::new();
        let (prometheus_layer, metric_handle) = METRICS
            .get_or_init(|| {
                let (layer, handle) = PrometheusMetricLayer::pair();
                (Arc::new(layer), Arc::new(handle))
            })
            .clone();
        let creds =
            Credentials::new("test", "test", None, None, "portfolio-tests");
        let s3_config = defaults(BehaviorVersion::latest())
            .credentials_provider(creds)
            .region(Region::new("auto"))
            // Reserved as "discard"; nothing listens here.
            .endpoint_url("http://127.0.0.1:9")
            .load()
            .await;

        Self {
            renderer: Arc::new(renderer),
            s3: Arc::new(Client::new(&s3_config)),
            bucket: Arc::new("test-bucket".to_owned()),
            resend_client: Arc::new(Resend::new("test-key")),
            experience_cache: Arc::new(RwLock::new(ExperienceCache::new())),
            experience_client: Self::create_experience_client(),
            github_api_key: Arc::new("test-key".to_owned()),
            contact_mail: Arc::new("contact@example.com".to_owned()),
            sender_mail: Arc::new("sender@example.com".to_owned()),
            data: Arc::new(Data::get()),
            font_css: Arc::new(font_css.to_owned()),
            dist_dir: Arc::new("dist".to_owned()),
            static_dir: Arc::new("static".to_owned()),
            prometheus_layer,
            metric_handle,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn item(name: &str) -> ExperienceItem {
        ExperienceItem {
            name: name.to_owned(),
            description: String::new(),
            url: String::new(),
            stars: 0,
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

    #[test]
    fn fresh_is_none_before_anything_is_stored() {
        let cache = ExperienceCache::new();

        assert!(cache.fresh(Duration::from_secs(60)).is_none());
    }

    #[test]
    fn fresh_returns_stored_items_within_the_ttl() {
        let mut cache = ExperienceCache::new();
        cache.store(vec![item("portfolio")]);

        let items = cache.fresh(Duration::from_secs(60)).unwrap();

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "portfolio");
    }

    #[test]
    fn fresh_is_none_once_the_ttl_has_elapsed() {
        let mut cache = ExperienceCache::new();
        cache.store(vec![item("portfolio")]);
        std::thread::sleep(Duration::from_millis(20));

        assert!(cache.fresh(Duration::from_millis(1)).is_none());
    }
}
