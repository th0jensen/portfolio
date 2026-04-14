use crate::types::Data;
use axum::{Router, extract::State, routing::get};
use std::sync::Arc;
mod types;

#[derive(Clone)]
struct AppState {
    data: Arc<Data>,
}

#[tokio::main]
async fn main() {
    let state = AppState {
        data: Arc::new(Data::get()),
    };

    let app: Router = Router::new()
        .route(
            "/",
            get(|State(state): State<AppState>| async move { axum::Json((*state.data).clone()) }),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
