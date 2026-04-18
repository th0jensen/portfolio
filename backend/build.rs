use std::fs;
use std::process::Command;

include!("src/types/data.rs");

fn main() {
    println!("cargo:rerun-if-changed=data/data.json");
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=base.html");
    println!("cargo:rerun-if-changed=../frontend/src");
    println!("cargo:rerun-if-changed=../frontend/package.json");
    println!("cargo:rerun-if-changed=../frontend/vite.config.ts");

    if std::env::var("CI").is_ok() {
        return;
    }

    let dist_dir = std::env::var("DIST_DIR")
        .unwrap_or_else(|_| "../frontend/dist".to_string());

    // Skipped in Docker where the frontend stage already ran bun.
    if std::env::var("SKIP_BUN_BUILD").is_err() {
        let status = Command::new("bun")
            .args(["run", "build"])
            .current_dir("../frontend")
            .status()
            .expect("Failed to spawn bun — is bun installed?");
        assert!(status.success(), "Frontend build failed");
    }

    let data_str =
        fs::read_to_string("data/data.json").expect("data/data.json not found");
    let data: Data = serde_json::from_str(&data_str)
        .expect("data/data.json does not match schema");

    let header_html =
        fs::read_to_string(format!("{dist_dir}/prerendered/header.html"))
            .expect("prerendered/header.html missing — run bun build first");

    let footer_html =
        fs::read_to_string(format!("{dist_dir}/prerendered/footer.html"))
            .expect("prerendered/footer.html missing — run bun build first");

    let description = escape_attr(&data.en.meta.description);

    for (_url, name) in [
        ("/", "index"),
        ("/projects", "projects"),
        ("/experience", "experience"),
        ("/contact", "contact"),
        ("/error", "error"),
    ] {
        let fragment =
            fs::read_to_string(format!("{dist_dir}/prerendered/{name}.html"))
                .unwrap_or_else(|_| panic!("prerendered/{name}.html missing"));

        let data_json = data_str.replace("</script", "<\\/script");

        let html = page_shell(
            &fragment,
            &header_html,
            &footer_html,
            &data_json,
            &description,
        );

        fs::write(format!("{dist_dir}/{name}.html"), html)
            .unwrap_or_else(|_| panic!("Failed to write {name}.html"));

        println!("cargo:warning=assembled: {name}.html");
    }
}

fn escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn page_shell(
    app_html: &str,
    header_html: &str,
    footer_html: &str,
    data_json: &str,
    description: &str,
) -> String {
    include_str!("base.html")
        .replace("%%DESC%%", description)
        .replace("%%DATA_JSON%%", data_json)
        .replace("%%HEADER%%", header_html)
        .replace("%%APP%%", app_html)
        .replace("%%FOOTER%%", footer_html)
}
