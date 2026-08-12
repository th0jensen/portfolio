use std::path::PathBuf;

use anyhow::{Context, Result, anyhow};
use aws_config::{BehaviorVersion, Region, defaults};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::Object;
use aws_sdk_s3::{Client, config::Credentials};
use image::ImageFormat;
use webp::Encoder;

use crate::command::Args;

/// Lossy WebP quality (0-100). High enough that re-encoding photos and
/// screenshots is visually lossless at web display sizes, while still
/// getting most of WebP's size advantage over JPEG/PNG.
const WEBP_QUALITY: f32 = 82.0;

#[derive(Clone, Copy)]
enum ImageTarget {
    WebP,
    Png,
}

impl ImageTarget {
    fn extension(self) -> &'static str {
        match self {
            Self::WebP => "webp",
            Self::Png => "png",
        }
    }
}

pub struct S3 {
    client: Client,
    bucket: String,
}

impl S3 {
    pub async fn new() -> Self {
        Self {
            client: Self::connect().await,
            bucket: Self::get_env_key("BUCKET_NAME"),
        }
    }

    pub async fn connect() -> Client {
        let (access_key, secret) = (
            Self::get_env_key("AWS_ACCESS_KEY_ID"),
            Self::get_env_key("AWS_SECRET_ACCESS_KEY"),
        );
        let creds = Credentials::new(access_key, secret, None, None, "Tigris");
        Client::new(
            &defaults(BehaviorVersion::latest())
                .credentials_provider(creds)
                .region(Region::new("auto"))
                .endpoint_url("https://fly.storage.tigris.dev")
                .load()
                .await,
        )
    }

    pub async fn verify(&self, args: Args) -> Result<()> {
        let file_name = &args.0[0];

        let obj = self
            .client
            .head_object()
            .key(file_name)
            .bucket(&self.bucket)
            .send()
            .await?;

        let file_size = Self::calculate_size(obj.content_length());
        println!("\nName:          {}", file_name);
        println!("Size:          {}", file_size);
        if let Some(obj_type) = obj.content_type() {
            println!("Type:          {}", obj_type);
        };
        if let Some(last_modified) = obj.last_modified() {
            println!("Last modified: {}\n", last_modified);
        }

        Ok(())
    }

    fn calculate_size(size: Option<i64>) -> String {
        let Some(bytes) = size.filter(|size| *size >= 0) else {
            return "Unknown".to_string();
        };

        const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
        let mut value = bytes as f64;
        let mut unit = 0;

        while value >= 1000.0 && unit < UNITS.len() - 1 {
            value /= 1000.0;
            unit += 1;
        }

        if unit == 0 {
            format!("{bytes} B")
        } else {
            format!("{value:.2} {}", UNITS[unit])
        }
    }

    pub async fn list(&self) -> Result<()> {
        let contents = match self.client.list_objects().bucket(&self.bucket).send().await {
            Ok(contents) => contents,
            Err(err) => {
                let msg = err.message().expect("error msg missing");
                return Err(anyhow!("{}", msg));
            }
        };

        let objs = match contents.contents {
            Some(objs) => objs,
            None => {
                return Err(anyhow!("Bucket {} is empty.", self.bucket));
            }
        };

        objs.iter().for_each(Self::list_obj);
        Self::list_summary(&objs);

        Ok(())
    }

    fn list_obj(obj: &Object) {
        let file_size = Self::calculate_size(obj.size());
        if let Some(name) = obj.key() {
            println!("\nName:          {name}");
        }
        println!("Size:          {file_size}");
        if let Some(last_modified) = obj.last_modified() {
            println!("Last modified: {last_modified}\n");
        }
    }

    fn list_summary(objs: &[Object]) {
        let total_items = objs.len();
        let sum = objs.iter().map(|o| o.size()).sum();
        let total_size = Self::calculate_size(sum);
        println!();
        println!("------------------------");
        println!("Total Items:   {total_items}");
        println!("Total Size:    {total_size}");
        println!("------------------------");
        println!();
    }

    pub async fn upload(&self, args: Args) -> Result<()> {
        let requested_key = args.0[0].clone();
        let file_path = PathBuf::from(&args.0[1]);
        let original = tokio::fs::read(&file_path)
            .await
            .with_context(|| format!("failed to read {}", file_path.display()))?;
        let original_size = original.len();

        let (key, body) = match Self::reencode_image(&original, ImageTarget::WebP)? {
            Some(webp) => (Self::with_extension(&requested_key, "webp"), webp),
            None => (requested_key.clone(), original),
        };
        let content_type = Self::content_type(&key);

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .content_type(content_type)
            .body(ByteStream::from(body.clone()))
            .send()
            .await?;

        if key != requested_key {
            println!(
                "Re-encoded to WebP: {requested_key} -> {key} ({} -> {})",
                Self::calculate_size(Some(original_size as i64)),
                Self::calculate_size(Some(body.len() as i64)),
            );
        }
        println!(
            "Upload successful: {key} from {} ({content_type})",
            file_path.display()
        );
        Ok(())
    }

    /// Re-encodes an object already in the bucket, uploading it under a key
    /// with the target format's extension. The original key is left
    /// untouched — use `delete` once you've verified the new one looks
    /// right. Defaults to WebP; pass "png" as a second argument to instead
    /// (re)generate a PNG, e.g. for a compatibility fallback.
    pub async fn reencode(&self, args: Args) -> Result<()> {
        let key = args.0[0].clone();
        let target = match args.0.get(1).map(String::as_str) {
            Some("png") => ImageTarget::Png,
            Some("webp") | None => ImageTarget::WebP,
            Some(other) => return Err(anyhow!("unknown target format '{other}', expected webp or png")),
        };

        let object = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await?;
        let original = object.body.collect().await?.into_bytes();
        let original_size = original.len();

        let Some(encoded) = Self::reencode_image(&original, target)? else {
            return Err(anyhow!(
                "{key} is not a re-encodable image (JPEG/PNG/WebP)"
            ));
        };
        let new_key = Self::with_extension(&key, target.extension());
        let new_size = encoded.len();

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&new_key)
            .content_type(Self::content_type(&new_key))
            .body(ByteStream::from(encoded))
            .send()
            .await?;

        println!(
            "Re-encoded: {key} -> {new_key} ({} -> {})",
            Self::calculate_size(Some(original_size as i64)),
            Self::calculate_size(Some(new_size as i64)),
        );
        if new_key != key {
            println!(
                "Note: old key '{key}' is still in the bucket; run /delete {key} once you've verified {new_key}."
            );
        }

        Ok(())
    }

    pub async fn delete(&self, args: Args) -> Result<()> {
        let key = args.0[0].clone();

        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(&key)
            .send()
            .await?;

        println!("Deleted: {key}");
        Ok(())
    }

    /// Re-encodes JPEG/PNG/WebP source bytes into the given target format.
    /// Returns `None` for anything else (SVG, fonts, PDF, WASM, JS, TOML,
    /// ...), which upload unchanged.
    fn reencode_image(bytes: &[u8], target: ImageTarget) -> Result<Option<Vec<u8>>> {
        let Ok(format) = image::guess_format(bytes) else {
            return Ok(None);
        };
        if !matches!(
            format,
            ImageFormat::Jpeg | ImageFormat::Png | ImageFormat::WebP
        ) {
            return Ok(None);
        }

        let decoded = image::load_from_memory_with_format(bytes, format)
            .context("failed to decode source image")?;

        let encoded = match target {
            ImageTarget::WebP => Encoder::from_image(&decoded)
                .map_err(|err| anyhow!("failed to prepare image for WebP encoding: {err}"))?
                .encode(WEBP_QUALITY)
                .to_vec(),
            ImageTarget::Png => {
                let mut buf = Vec::new();
                decoded
                    .write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::Png)
                    .context("failed to encode image as PNG")?;
                buf
            }
        };

        Ok(Some(encoded))
    }

    fn with_extension(key: &str, extension: &str) -> String {
        match key.rsplit_once('.') {
            Some((stem, _ext)) => format!("{stem}.{extension}"),
            None => format!("{key}.{extension}"),
        }
    }

    /// Objects are served straight back to browsers and to social crawlers,
    /// which reject previews that arrive as application/octet-stream.
    fn content_type(key: &str) -> &'static str {
        let extension = key
            .rsplit_once('.')
            .map(|(_, extension)| extension.to_ascii_lowercase())
            .unwrap_or_default();

        match extension.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "woff2" => "font/woff2",
            "pdf" => "application/pdf",
            "js" => "text/javascript",
            "wasm" => "application/wasm",
            "json" => "application/json",
            "toml" => "text/plain; charset=utf-8",
            _ => "application/octet-stream",
        }
    }

    fn get_env_key(key: &str) -> String {
        let msg = format!("Missing {}", key);
        dotenvy::dotenv().ok();
        std::env::var(key).expect(&msg)
    }
}
