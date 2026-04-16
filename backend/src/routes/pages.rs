use axum::extract::State;

use crate::{AppState, templates::PageTemplate};

fn current_year() -> u32 {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    (1970 + secs / 31_557_600) as u32
}

pub async fn page_handler(State(state): State<AppState>) -> PageTemplate {
    let data = &state.data;
    let year = current_year().to_string();
    PageTemplate {
        header_html: (*state.header_html).clone(),
        data_json: serde_json::to_string(data.as_ref())
            .expect("Data serialization cannot fail"),
        copyright_en: data.en.footer.copyright.replace("{year}", &year),
        copyright_no: data.no.footer.copyright.replace("{year}", &year),
    }
}
