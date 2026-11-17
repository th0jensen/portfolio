//! End-to-end tests for the server-rendered HTML.
//!
//! These drive the real compiled renderer (`frontend/dist/renderer`) against a
//! qubit RPC stub, so they assert on the exact markup production serves. They
//! cover the production boundary: island markers, hydration snapshots and
//! escaping are only observable in the rendered output.
//!
//! Run `just frontend::build` first; these need the compiled binary.

use std::{path::PathBuf, sync::Arc, time::Duration};

use portfolio_backend::{
    renderer::{RenderRoute, RendererClient, RendererConfig, load_assets},
    types::{Assets, Data as PortfolioData},
};

/// Titles are defined in Rust, so assert the literal rather than re-deriving it
/// from the code under test.
fn expected_title(route: &RenderRoute) -> &'static str {
    match route {
        RenderRoute::Home => "Thomas Jensen",
        RenderRoute::Projects => "Projects — Thomas Jensen",
        RenderRoute::Experience => "Experience — Thomas Jensen",
        RenderRoute::Contact => "Contact — Thomas Jensen",
        RenderRoute::Automata => "Cellular Automata — Thomas Jensen",
        RenderRoute::Project(_) => "Project — Thomas Jensen",
    }
}

/// Ilha serialises hydration state into `<template data-ilha-state="...">`.
fn snapshot_count(html: &str) -> usize {
    html.matches("data-ilha-state").count()
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
// below share `REAL_RENDERER_SLOTS` so they never fight over that port,
// but it will still conflict with a `just dev` server already running.
static REAL_RENDERER_SLOTS: tokio::sync::Semaphore =
    tokio::sync::Semaphore::const_new(1);

#[derive(Clone)]
struct StubRpcCtx {
    data: std::sync::Arc<portfolio_backend::types::Data>,
    hang_data: std::sync::Arc<std::sync::atomic::AtomicBool>,
    data_calls: std::sync::Arc<std::sync::atomic::AtomicU32>,
}

// Method names are derived from the function identifier by the
// `handler` macro, and must match what the real render-worker's qubit
// client calls (`api.data.query()` / `api.experience.query()`).
#[qubit::handler(query)]
async fn data(ctx: StubRpcCtx) -> portfolio_backend::types::Data {
    ctx.data_calls
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    if ctx.hang_data.load(std::sync::atomic::Ordering::SeqCst) {
        std::future::pending::<()>().await;
    }
    (*ctx.data).clone()
}

#[qubit::handler(query)]
async fn experience(
    ctx: StubRpcCtx,
) -> Vec<portfolio_backend::types::ExperienceItem> {
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
        Self::spawn_with(portfolio_backend::types::Data::get()).await
    }

    async fn spawn_with(stub_data: portfolio_backend::types::Data) -> Self {
        let hang_data =
            std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let data_calls =
            std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0));
        let ctx = StubRpcCtx {
            data: std::sync::Arc::new(stub_data),
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
        self.hang_data
            .store(hang, std::sync::atomic::Ordering::SeqCst);
    }

    fn data_call_count(&self) -> u32 {
        self.data_calls.load(std::sync::atomic::Ordering::SeqCst)
    }

    async fn shutdown(self) {
        let _ = self.handle.stop();
        self.task.abort();
        let _ = self.task.await;
    }
}

fn real_renderer_paths() -> (PathBuf, PathBuf) {
    let renderer_bin = PathBuf::from(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../frontend/dist/renderer"
    ));
    let dist_dir =
        PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../frontend/dist"));

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
        data: Arc::new(PortfolioData::get()),
        timeout,
        cold_timeout,
        startup_timeout: Duration::from_secs(10),
        cache_ttl: Duration::from_millis(300),
    }
}

#[tokio::test]
async fn real_renderer_binary_renders_every_route() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();
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
        let output = client.render(route.clone()).await.unwrap();

        assert!(
            output.error.is_none(),
            "{route:?} returned an error: {:?}",
            output.error
        );
        let html = output.html.expect("renderer returned no html");
        assert_eq!(output.status, 200, "{route:?} should render successfully");
        assert!(
            !html.contains("data-ilha-error"),
            "{route:?} embedded an SSR error in its HTML"
        );
        assert!(
            html.contains("<!doctype html>"),
            "{route:?} missing doctype"
        );
        assert!(
            html.contains(&format!(
                "<title>{}</title>",
                expected_title(&route).replace('&', "&amp;")
            )),
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

    // Only Home carries Person structured data (see `seo`).
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
async fn real_renderer_binary_renders_a_project_subpage() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();
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
    let fixture_data = PortfolioData::get();
    let project = fixture_data
        .projects
        .iter()
        .find(|project| project.slug == "crabdash")
        .expect("fixture data.json should contain the crabdash project");

    let route = RenderRoute::Project("crabdash".to_owned());
    let output = client.render(route.clone()).await.unwrap();

    assert!(
        output.error.is_none(),
        "render returned an error: {:?}",
        output.error
    );
    let html = output.html.expect("renderer returned no html");
    assert!(html.contains(&project.name), "missing the project name");
    assert!(
        html.contains("Crabdash is a native homelab dashboard"),
        "missing the project overview text"
    );
    assert!(
        html.contains(&route.canonical("https://example.com")),
        "missing its canonical link"
    );

    // A second slug must select a different page in the same persistent worker.
    let second = client
        .render(RenderRoute::Project("cellular-automata".to_owned()))
        .await
        .unwrap();
    assert_eq!(second.status, 200);
    let second_html = second.html.expect("missing second project HTML");
    let heading = second_html.split_once("<h1").unwrap().1;
    let heading = heading.split_once("</h1>").unwrap().0;
    assert!(heading.contains("Cellular Automata"));

    let missing = client
        .render(RenderRoute::Project("missing-project".to_owned()))
        .await
        .unwrap();
    assert_eq!(missing.status, 404);
    assert!(missing.html.unwrap().contains("This route doesn’t exist."));

    server.shutdown().await;
}

#[tokio::test]
async fn real_renderer_worker_times_out_and_is_replaced() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();
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

/// Boots the real renderer against the stub and renders `routes` in one session.
async fn render_all(routes: &[RenderRoute]) -> Vec<(RenderRoute, String)> {
    let (renderer_bin, dist_dir) = real_renderer_paths();
    let assets = load_assets(&dist_dir).expect(
        "failed to read the built Vite manifest; run `just frontend::build` first",
    );
    let server = StubRpcServer::spawn().await;
    let client = RendererClient::new(real_renderer_config(
        renderer_bin,
        assets,
        Duration::from_secs(5),
        Duration::from_secs(10),
    ))
    .await
    .unwrap();

    let mut rendered = Vec::new();
    for route in routes {
        let output = client.render(route.clone()).await.unwrap();
        assert!(output.error.is_none(), "{route:?}: {:?}", output.error);
        rendered.push((
            route.clone(),
            output.html.expect("renderer returned no html"),
        ));
    }

    server.shutdown().await;
    rendered
}

fn all_routes() -> Vec<RenderRoute> {
    vec![
        RenderRoute::Home,
        RenderRoute::Projects,
        RenderRoute::Project("crabdash".to_owned()),
        RenderRoute::Experience,
        RenderRoute::Contact,
        RenderRoute::Automata,
    ]
}

/// Every document must identify its interactive chrome to Void's island loader.
#[tokio::test]
async fn every_route_marks_its_layout_islands_and_ships_one_entry_module() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    for (route, html) in render_all(&all_routes()).await {
        assert_eq!(
            html.matches(r#"data-island="header""#).count(),
            1,
            "{route:?} should mark exactly one header island"
        );
        assert_eq!(
            html.matches(r#"data-island="footer""#).count(),
            if route == RenderRoute::Contact { 0 } else { 1 },
            "{route:?} has the wrong number of footer islands"
        );
        assert_eq!(
            html.matches(r#"<script type="module""#).count(),
            1,
            "{route:?} should load exactly one entry module"
        );
    }
}

/// The frontend's `islandPages` table decides both which routes hydrate and
/// which get a snapshot. A hydrated page without its snapshot reads `undefined`
/// server data and dies on the client. Every page needs to hydrate so language
/// changes update its content alongside the header and, except on contact,
/// footer.
#[tokio::test]
async fn every_page_carries_a_snapshot_for_live_language_changes() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    for (route, html) in render_all(&all_routes()).await {
        assert_eq!(
            snapshot_count(&html),
            if route == RenderRoute::Contact { 2 } else { 3 },
            "{route:?} has the wrong number of hydration snapshots"
        );
    }
}

/// `useServerData` returns `undefined` unless the server populated it, so a
/// literal `undefined` in the markup means a component read data it never got.
#[tokio::test]
async fn no_route_leaks_undefined_into_the_markup() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    for (route, html) in render_all(&all_routes()).await {
        assert!(
            !html.contains("undefined"),
            "{route:?} leaked `undefined` into the rendered HTML"
        );
    }
}

/// Some crawlers read only the first `og:image`, and PNG decodes everywhere
/// while WebP does not, so the PNG has to come first.
#[tokio::test]
async fn og_images_list_png_before_webp_and_canonicalise_to_the_site_origin() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    for (route, html) in render_all(&all_routes()).await {
        let png = html.find("og-card.png").expect("missing the PNG og:image");
        let webp = html
            .find("og-card.webp")
            .expect("missing the WebP og:image");
        assert!(png < webp, "{route:?} lists WebP before PNG");

        assert!(
            html.contains(&format!(
                r#"<link rel="canonical" href="{}""#,
                route.canonical("https://example.com")
            )),
            "{route:?} should canonicalise to the configured site origin"
        );
    }
}

/// Person structured data belongs on the profile page only; duplicating it
/// across the site is a rich-results violation.
#[tokio::test]
async fn only_the_home_page_emits_person_structured_data() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    for (route, html) in render_all(&all_routes()).await {
        let has_json_ld = html.contains(r#"application/ld+json"#);
        assert_eq!(
            has_json_ld,
            route == RenderRoute::Home,
            "{route:?} has the wrong structured-data presence"
        );
    }
}

/// Project copy comes from `data.json` over RPC and is interpolated into the
/// document shell, so it has to be escaped on the way out.
#[tokio::test]
async fn hostile_project_copy_is_escaped_in_the_rendered_html() {
    let _permit = REAL_RENDERER_SLOTS.acquire().await.unwrap();

    let mut hostile = PortfolioData::get();
    let project = hostile
        .projects
        .iter_mut()
        .find(|project| project.slug == "crabdash")
        .expect("fixture data.json should contain the crabdash project");
    project.name = "</title><script>alert(1)</script>".to_owned();
    project.description = r#"a " quote & an <img src=x>"#.to_owned();

    let (renderer_bin, dist_dir) = real_renderer_paths();
    let assets = load_assets(&dist_dir).unwrap();
    let server = StubRpcServer::spawn_with(hostile).await;
    let client = RendererClient::new(real_renderer_config(
        renderer_bin,
        assets,
        Duration::from_secs(5),
        Duration::from_secs(10),
    ))
    .await
    .unwrap();

    let html = client
        .render(RenderRoute::Project("crabdash".to_owned()))
        .await
        .unwrap()
        .html
        .expect("renderer returned no html");

    server.shutdown().await;

    assert!(
        !html.contains("<script>alert(1)</script>"),
        "hostile project name was not escaped"
    );
    assert!(
        !html.contains("<img src=x>"),
        "hostile project description was not escaped"
    );
    assert!(
        html.contains("&lt;script&gt;"),
        "expected the escaped form of the hostile name"
    );
}
