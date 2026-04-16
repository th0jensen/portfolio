use askama::Template;
use askama_derive_axum::IntoResponse;

#[derive(Template, IntoResponse)]
#[template(path = "base.html")]
pub struct PageTemplate {
    pub header_html: String,
    pub data_json: String,
    pub copyright_en: String,
    pub copyright_no: String,
}
