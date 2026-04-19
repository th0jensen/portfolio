use axum::{Json, extract::State, response::IntoResponse};
use resend_rs::{Resend, types::CreateEmailBaseOptions};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::AppState;

#[derive(ts_rs::TS, Debug, Deserialize, Serialize)]
#[ts(export)]
pub struct EmailPayload {
    full_name: String,
    email: String,
    content: String,
}

#[derive(Serialize)]
struct ApiResponse {
    ok: bool,
    message: &'static str,
}

pub async fn dispatch_email(
    State(state): State<AppState>,
    Json(payload): Json<EmailPayload>,
) -> impl IntoResponse {
    info!("Handling contact form request: {:?}", &payload);

    let EmailPayload {
        full_name,
        email,
        content,
    } = &payload;

    let client = Resend::new(&state.resend_api_key);

    let from = &state.sender_mail.to_string();
    let to: [&str; 1] = [&state.contact_mail];
    let subject = format!("New Contact Request from {}", full_name);

    let email = CreateEmailBaseOptions::new(from, to, subject)
        .with_reply(email)
        .with_text(content);

    match client.emails.send(email).await {
        Ok(email) => {
            info!("Successfully sent email: {:?}", email);
            Json(ApiResponse {
                ok: true,
                message: "Mail was successfully sent!",
            })
        }
        Err(email) => {
            error!("Failed to send email: {:?}", email);
            Json(ApiResponse {
                ok: false,
                message: "Something went wrong while sending the mail...",
            })
        }
    }
}
