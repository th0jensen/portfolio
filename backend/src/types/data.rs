use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
#[ts(export)]
pub struct Data {
    pub en: LocaleData,
    pub no: LocaleData,
    pub about: About,
    pub projects: Vec<Project>,
}

const DATA: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/data/data.json"));

impl Data {
    pub fn get() -> Self {
        serde_json::from_str(DATA).expect("Failed to parse data.json!")
    }
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct LocaleData {
    pub meta: Meta,
    pub nav: Nav,
    pub hero: Hero,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct Meta {
    pub description: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct Nav {
    pub about: String,
    pub work: String,
    pub experience: String,
    pub contact: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct About {
    pub first_name: String,
    pub last_name: String,
    pub birthday: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct Hero {
    pub role: String,
    pub description: String,
    pub currently_building: String,
    pub explore_work: String,
}

#[derive(ts_rs::TS, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub image_url: String,
    pub technologies: HashMap<String, String>,
    pub description: String,
    pub source_type: String,
    pub source_link: String,
}
