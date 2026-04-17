use axum::{Router, extract::State, routing::get};

use crate::{AppState, types::Data};

pub fn router() -> Router<AppState> {
    Router::new().route("/data", get(get_data))
}

pub async fn get_data(State(state): State<AppState>) -> axum::Json<Data> {
    axum::Json((*state.data).clone())
}
