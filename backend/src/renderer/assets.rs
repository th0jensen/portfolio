use std::{collections::HashMap, fs, path::Path};

use anyhow::{Context, Result};
use serde::Deserialize;

use crate::types::Assets;

#[derive(Deserialize)]
struct ManifestEntry {
    file: String,
    #[serde(default)]
    css: Vec<String>,
    #[serde(default, rename = "isEntry")]
    is_entry: bool,
}

pub fn load_assets(dist_dir: &Path) -> Result<Assets> {
    let manifest_path = dist_dir.join(".vite/manifest.json");
    let manifest = fs::read_to_string(&manifest_path).with_context(|| {
        format!("failed to read {}", manifest_path.display())
    })?;
    let entries: HashMap<String, ManifestEntry> =
        serde_json::from_str(&manifest).context("invalid Vite manifest")?;

    let entry = entries
        .iter()
        .find(|(name, entry)| entry.is_entry || name.as_str() == "index.html")
        .map(|(_, entry)| entry)
        .context("Vite manifest has no entry module")?;
    let css = entry
        .css
        .first()
        .cloned()
        .context("Vite entry has no CSS asset")?;

    Ok(Assets {
        css,
        js: entry.file.clone(),
    })
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use indoc::indoc;

    use super::*;

    struct TempDistDir(PathBuf);

    impl TempDistDir {
        fn with_manifest(manifest_json: &str) -> Self {
            let dir = Self::unique_dir();
            fs::create_dir_all(dir.join(".vite")).unwrap();
            fs::write(dir.join(".vite/manifest.json"), manifest_json).unwrap();
            Self(dir)
        }

        fn empty() -> Self {
            let dir = Self::unique_dir();
            fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }

        fn unique_dir() -> PathBuf {
            std::env::temp_dir().join(format!(
                "portfolio-backend-test-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ))
        }
    }

    impl Drop for TempDistDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn load_assets_reads_the_entry_module_from_the_vite_manifest() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index-abc123.js",
                "css": ["assets/index-abc123.css"],
                "isEntry": true
              }
            }
        "#});

        let assets = load_assets(&dist.0).unwrap();

        assert_eq!(assets.js, "assets/index-abc123.js");
        assert_eq!(assets.css, "assets/index-abc123.css");
    }

    #[test]
    fn load_assets_falls_back_to_the_index_html_key_without_is_entry() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index-xyz.js",
                "css": ["assets/index-xyz.css"]
              }
            }
        "#});

        let assets = load_assets(&dist.0).unwrap();

        assert_eq!(assets.js, "assets/index-xyz.js");
    }

    #[test]
    fn load_assets_errors_when_manifest_is_missing() {
        let dist = TempDistDir::empty();

        let error = load_assets(&dist.0).unwrap_err();

        assert!(error.to_string().contains("failed to read"));
    }

    #[test]
    fn load_assets_errors_when_entry_has_no_css() {
        let dist = TempDistDir::with_manifest(indoc! {r#"
            {
              "index.html": {
                "file": "assets/index.js",
                "css": [],
                "isEntry": true
              }
            }
        "#});

        let error = load_assets(&dist.0).unwrap_err();

        assert!(error.to_string().contains("no CSS asset"));
    }
}
