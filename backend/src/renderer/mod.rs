//! Server-side rendering: route metadata in, HTML out.
//!
//! The pieces are deliberately separate. `route` owns which URLs exist and the
//! SEO head each one gets, and knows nothing about processes. `worker` owns the
//! newline-delimited JSON protocol spoken to the Deno child. `client` pools and
//! caches those workers. `assets` resolves the Vite manifest.

mod assets;
mod client;
mod config;
mod route;
#[cfg(test)]
pub(crate) mod test_support;
mod worker;

pub use assets::load_assets;
pub use client::RendererClient;
pub use config::RendererConfig;
pub use route::RenderRoute;
