use std::path::PathBuf;

use anyhow::{Result, anyhow};
use aws_config::{BehaviorVersion, Region, defaults};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::Object;
use aws_sdk_s3::{Client, config::Credentials};

use crate::command::Args;

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

    fn list_summary(objs: &Vec<Object>) {
        let total_items = objs.len();
        let sum = objs.iter().map(|o| o.size()).sum();
        let total_size = Self::calculate_size(sum);
        println!("");
        println!("------------------------");
        println!("Total Items:   {total_items}");
        println!("Total Size:    {total_size}");
        println!("------------------------");
        println!("");
    }

    pub async fn upload(&self, args: Args) -> Result<()> {
        let file_name = args.0[0].clone();
        let file_path = PathBuf::from(&args.0[1]);
        let body = ByteStream::from_path(&file_path).await?;

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&file_name)
            .body(body)
            .send()
            .await?;

        println!("Upload successful: {:?} as {}", file_path, &file_name);
        Ok(())
    }

    fn get_env_key(key: &str) -> String {
        let msg = format!("Missing {}", key);
        dotenvy::dotenv().ok();
        std::env::var(key).expect(&msg)
    }
}
