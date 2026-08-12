use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct RenderOutput {
    pub id: u32,
    pub status: u16,
    pub html: Option<String>,
    pub error: Option<String>,
    pub headers: HashMap<String, String>,
}

#[allow(dead_code)]
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct RenderInput {
    pub id: u32,
    pub url: String,
    pub rpc_origin: String,
    pub assets: Assets,
    pub head: Head,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Assets {
    pub css: String,
    pub js: String,
}

/// Per-route document head, defined on the Rust side and handed to the
/// renderer so every page gets its own title, canonical URL, and social
/// preview metadata.
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Head {
    pub title: String,
    pub description: String,
    /// Absolute production URL for this route; also used as `og:url`.
    pub canonical: String,
    pub robots: String,
    pub og: OpenGraph,
    pub structured_data: StructuredData,
}

/// Open Graph fields that are not already covered by title, description,
/// and canonical.
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct OpenGraph {
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    pub og_type: String,
    pub site_name: String,
    pub locale: String,
    /// Listed in the order crawlers should try them. Some scrapers only
    /// ever look at the first `og:image` tag, so the most universally
    /// decodable format belongs first, with nicer/smaller formats after
    /// as an upgrade for crawlers that support them.
    pub images: Vec<OpenGraphImage>,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct OpenGraphImage {
    pub url: String,
    pub alt: String,
    pub mime: String,
    pub width: u32,
    pub height: u32,
}

/// Which JSON-LD block, if any, the renderer should emit for a route.
#[derive(ts_rs::TS, Clone, Copy, Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum StructuredData {
    None,
    Person,
}

#[allow(dead_code)]
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct HeaderData {
    pub en: HeaderLocaleData,
    pub no: HeaderLocaleData,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct HeaderLocaleData {
    pub nav: Nav,
    pub buttons: Buttons,
    pub theme: Theme,
}

#[allow(dead_code)]
#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Data {
    pub en: LocaleData,
    pub no: LocaleData,
    pub about: About,
    pub projects: Vec<Project>,
    pub experience_items: Vec<ExperienceItem>,
    pub locales: Vec<Locale>,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct ExperienceItem {
    pub name: String,
    pub description: String,
    pub url: String,
    pub stars: i64,
    pub forks: i64,
    pub language: String,
    pub language_color: String,
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    pub item_type: String,
    pub downloads: Option<i64>,
    #[ts(optional)]
    pub pr_number: Option<i64>,
    #[ts(optional)]
    pub pr_state: Option<String>,
    #[ts(optional)]
    pub additions: Option<i64>,
    #[ts(optional)]
    pub deletions: Option<i64>,
    #[ts(optional)]
    pub zed_extension_url: Option<String>,
    #[ts(optional)]
    pub github_url: Option<String>,
    #[ts(optional)]
    pub featured: Option<bool>,
    #[ts(skip)]
    pub zed_extension_id: Option<String>,
}

const DATA: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/data/data.json"));

impl Data {
    pub fn get() -> Self {
        serde_json::from_str(DATA).expect("Failed to parse data.json!")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use indoc::indoc;

    #[test]
    fn data_get_parses_the_embedded_data_json() {
        let data = Data::get();

        assert!(!data.projects.is_empty());
        assert!(!data.experience_items.is_empty());
        assert!(!data.locales.is_empty());
    }

    #[test]
    fn render_output_round_trips_through_json() {
        let output = RenderOutput {
            id: 7,
            status: 200,
            html: Some("<html></html>".to_owned()),
            error: None,
            headers: HashMap::from([("x-req".to_owned(), "abc".to_owned())]),
        };

        let json = serde_json::to_string(&output).unwrap();
        let parsed: RenderOutput = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.id, 7);
        assert_eq!(parsed.status, 200);
        assert_eq!(parsed.html.as_deref(), Some("<html></html>"));
        assert_eq!(
            parsed.headers.get("x-req").map(String::as_str),
            Some("abc")
        );
    }

    #[test]
    fn structured_data_serializes_to_snake_case() {
        assert_eq!(
            serde_json::to_string(&StructuredData::Person).unwrap(),
            "\"person\""
        );
        assert_eq!(
            serde_json::to_string(&StructuredData::None).unwrap(),
            "\"none\""
        );
    }

    #[test]
    fn open_graph_serializes_og_type_field_as_type() {
        let og = OpenGraph {
            og_type: "profile".to_owned(),
            site_name: "Thomas Jensen".to_owned(),
            locale: "en_US".to_owned(),
            images: vec![OpenGraphImage {
                url: "https://example.com/og.png".to_owned(),
                alt: "alt text".to_owned(),
                mime: "image/png".to_owned(),
                width: 1200,
                height: 630,
            }],
        };

        let json = serde_json::to_value(&og).unwrap();

        assert_eq!(json["type"], "profile");
        assert!(json.get("og_type").is_none());
    }

    #[test]
    fn experience_item_deserializes_type_field_and_defaults_missing_optionals()
    {
        let json = indoc! {r##"
            {
              "name": "portfolio",
              "description": "a website",
              "url": "https://github.com/th0jensen/portfolio",
              "stars": 3,
              "forks": 1,
              "language": "Rust",
              "language_color": "#dea584",
              "type": "repo",
              "downloads": null
            }
        "##};

        let item: ExperienceItem = serde_json::from_str(json).unwrap();

        assert_eq!(item.item_type, "repo");
        assert_eq!(item.downloads, None);
        assert_eq!(item.pr_number, None);
        assert_eq!(item.zed_extension_id, None);
        assert_eq!(item.featured, None);
    }
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct LocaleData {
    pub meta: Meta,
    pub nav: Nav,
    pub hero: Hero,
    pub buttons: Buttons,
    pub work: Work,
    pub experience: Experience,
    pub theme: Theme,
    pub contact: Contact,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Meta {
    pub description: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Nav {
    pub about: String,
    pub work: String,
    pub experience: String,
    pub contact: String,
    pub open_menu: String,
    pub close_menu: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct About {
    pub first_name: String,
    pub last_name: String,
    pub birthday: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Hero {
    pub role: String,
    pub description: String,
    pub currently_building: String,
    pub now_playing: String,
    pub by: String,
    pub explore_work: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Project {
    pub slug: String,
    pub name: String,
    pub image_url: String,
    pub technologies: HashMap<String, String>,
    pub description: String,
    pub overview: String,
    pub highlights: Vec<String>,
    pub source_type: String,
    pub source_link: String,
    #[ts(optional)]
    pub featured: Option<bool>,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Buttons {
    pub github: SocialButton,
    pub linkedin: SocialButton,
    pub resume: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct SocialButton {
    label: String,
    url: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Work {
    pub subtitle: String,
    pub visit_project: String,
    pub download_app_store: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Experience {
    pub subtitle: String,
    pub description: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Theme {
    pub light: String,
    pub dark: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Contact {
    pub full_name: String,
    pub email: String,
    pub content: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize, Debug)]
pub struct Locale {
    pub code: String,
    pub label: String,
    pub flag: String,
}
