use crate::types::Data;
use axum::Router;
use std::sync::Arc;
use tower_http::services::ServeDir;
mod routes;
mod types;

#[derive(Clone)]
struct AppState {
    data: Arc<Data>,
}

const URL: &str = "0.0.0.0";
const PORT: &str = "3000";

#[tokio::main]
async fn main() {
    let state = AppState {
        data: Arc::new(Data::get()),
    };

    let app: Router = Router::new()
        .nest("/api", routes::api::router())
        .fallback_service(ServeDir::new("../frontend/dist"))
        .with_state(state);

    let path = format!("{}:{}", URL, PORT);
    let listener = tokio::net::TcpListener::bind(&path).await.unwrap();
    println!("Listening on: http://{}", &path);
    axum::serve(listener, app).await.unwrap();
}
