#[cfg(debug_assertions)]
use std::path::Path;
use std::{sync::LazyLock, time::Duration};

use axum::{
    Json, Router,
    extract::State,
    response::{IntoResponse, Response},
    routing::post,
};
use http::StatusCode;
use regex::Regex;
use resend_rs::types::CreateEmailBaseOptions;
use serde::{Deserialize, Serialize};
use tower_governor::{
    GovernorError, GovernorLayer, governor::GovernorConfigBuilder,
    key_extractor::SmartIpKeyExtractor,
};
#[cfg(debug_assertions)]
use ts_rs::TS;

use crate::AppState;

const EMAIL_RATE_LIMIT_PERIOD: Duration = Duration::from_secs(30);
const EMAIL_RATE_LIMIT_BURST: u32 = 1;

#[derive(ts_rs::TS, Debug, Deserialize, Serialize)]
pub struct EmailPayload {
    full_name: String,
    email: String,
    content: String,
}

#[derive(ts_rs::TS, Clone, Serialize)]
pub struct ApiResponse {
    pub ok: bool,
    pub message: String,
}

static EMAIL_RE: LazyLock<Option<Regex>> =
    LazyLock::new(|| Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").ok());

fn is_email(email: &str) -> bool {
    EMAIL_RE.as_ref().is_some_and(|re| re.is_match(email))
}

pub fn router() -> Router<AppState<'static>> {
    let governor = GovernorConfigBuilder::default()
        .const_period(EMAIL_RATE_LIMIT_PERIOD)
        .const_burst_size(EMAIL_RATE_LIMIT_BURST)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .expect("email rate limit must have a non-zero period and burst");

    Router::new().route("/contact", post(dispatch_email)).layer(
        GovernorLayer::new(governor).error_handler(rate_limited_response),
    )
}

#[cfg(debug_assertions)]
pub(crate) fn write_bindings_to_dir(out_dir: &Path) {
    EmailPayload::export_all_to(out_dir).unwrap();
    ApiResponse::export_all_to(out_dir).unwrap();
}

async fn dispatch_email(
    State(ctx): State<AppState<'static>>,
    Json(payload): Json<EmailPayload>,
) -> Json<ApiResponse> {
    let EmailPayload {
        full_name,
        email,
        content,
    } = payload;

    tracing::info!(name = %full_name, "contact form received");

    if full_name.trim().is_empty()
        || email.trim().is_empty()
        || !is_email(&email)
        || content.trim().is_empty()
    {
        tracing::warn!(name = %full_name, "contact form validation failed");
        return Json(ApiResponse {
            ok: false,
            message: "All fields are required to be non-empty and valid."
                .into(),
        });
    }

    let from = &ctx.sender_mail.to_string();
    let to: [&str; 1] = [&ctx.contact_mail];
    let subject = format!("New Contact Request from {}", full_name);

    let email = CreateEmailBaseOptions::new(from, to, subject)
        .with_reply(&email)
        .with_text(&content);

    match ctx.resend_client.emails.send(email).await {
        Ok(email) => {
            tracing::info!("Successfully sent email: {:?}", email);
            Json(ApiResponse {
                ok: true,
                message: "Mail was successfully sent!".into(),
            })
        }
        Err(email) => {
            tracing::error!("Failed to send email: {:?}", email);
            Json(ApiResponse {
                ok: false,
                message: "Something went wrong while sending the mail..."
                    .into(),
            })
        }
    }
}

fn rate_limited_response(error: GovernorError) -> Response {
    let GovernorError::TooManyRequests { wait_time, headers } = error else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                ok: false,
                message: "Unable to apply the contact form rate limit.".into(),
            }),
        )
            .into_response();
    };

    let mut response = (
        StatusCode::TOO_MANY_REQUESTS,
        Json(ApiResponse {
            ok: false,
            message: format!(
                "Too many messages. Try again in {wait_time} seconds."
            ),
        }),
    )
        .into_response();

    if let Some(headers) = headers {
        response.headers_mut().extend(headers);
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    use crate::renderer::{RendererClient, test_support::fake_renderer_config};

    async fn test_state() -> AppState<'static> {
        let renderer = RendererClient::new(fake_renderer_config(None))
            .await
            .expect("fake renderer should start; is `deno` on PATH?");

        AppState::for_tests(renderer, "").await
    }

    fn payload(full_name: &str, email: &str, content: &str) -> EmailPayload {
        EmailPayload {
            full_name: full_name.to_owned(),
            email: email.to_owned(),
            content: content.to_owned(),
        }
    }

    /// The browser gates these with `required` / `type=email` / `minlength`, but
    /// that is only a convenience: the form posts JSON, so anything can reach
    /// this handler. These cases are the reason the client ships no validator.
    #[tokio::test]
    async fn a_submission_missing_any_field_is_rejected_before_sending() {
        let state = test_state().await;

        let rejected = [
            payload("", "a@b.com", "a real message"),
            payload("Ada", "", "a real message"),
            payload("Ada", "a@b.com", ""),
            // Whitespace passes the browser's `required`, so Rust has to trim.
            payload("   ", "a@b.com", "a real message"),
            payload("Ada", "a@b.com", "   "),
            payload("Ada", "not-an-email", "a real message"),
            payload("Ada", "a@b", "a real message"),
        ];

        for input in rejected {
            let described = format!("{input:?}");
            let Json(response) =
                dispatch_email(State(state.clone()), Json(input)).await;

            assert!(!response.ok, "should have been rejected: {described}");
            assert_eq!(
                response.message,
                "All fields are required to be non-empty and valid."
            );
        }
    }

    #[test]
    fn is_email_accepts_valid_and_rejects_invalid_addresses() {
        for valid in ["a@b.com", "first.last@sub.example.co", "x@y.io"] {
            assert!(is_email(valid), "expected {valid} to be valid");
        }

        for invalid in
            ["", "no-at-sign", "a@b", "a b@c.com", "@c.com", "a@.com"]
        {
            assert!(!is_email(invalid), "expected {invalid} to be invalid");
        }
    }

    #[tokio::test]
    async fn rate_limited_response_maps_too_many_requests_to_429_with_headers()
    {
        let mut retry_headers = http::HeaderMap::new();
        retry_headers
            .insert("retry-after", http::HeaderValue::from_static("5"));

        let response = rate_limited_response(GovernorError::TooManyRequests {
            wait_time: 5,
            headers: Some(retry_headers),
        });

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(response.headers().get("retry-after").unwrap(), "5");

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(parsed["ok"], false);
        assert!(parsed["message"].as_str().unwrap().contains("5 seconds"));
    }

    #[test]
    fn rate_limited_response_maps_other_governor_errors_to_500() {
        let response = rate_limited_response(GovernorError::UnableToExtractKey);

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
