use crate::{observability::redact, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use std::{collections::HashMap, sync::Mutex, time::Instant};

const MAX_REPORTS_PER_MINUTE: usize = 20;
const REPORT_WINDOW_SECS: u64 = 60;

#[derive(Default)]
pub struct ErrorReportRateLimiter {
    requests: Mutex<HashMap<String, Vec<Instant>>>,
}

impl ErrorReportRateLimiter {
    pub fn check(&self, ip: &str) -> bool {
        let mut map = self.requests.lock().unwrap_or_else(|e| e.into_inner());
        let now = Instant::now();
        let window = std::time::Duration::from_secs(REPORT_WINDOW_SECS);
        let entries = map.entry(ip.to_string()).or_default();
        entries.retain(|t| now.duration_since(*t) < window);
        if entries.len() >= MAX_REPORTS_PER_MINUTE {
            return false;
        }
        entries.push(now);
        true
    }
}

#[derive(Debug, Deserialize)]
pub struct ClientErrorReport {
    #[serde(default = "default_frontend_source")]
    pub source: String,
    pub message: String,
    #[serde(default)]
    pub stack: Option<String>,
    #[serde(default)]
    pub page: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default, rename = "type")]
    pub error_type: Option<String>,
    #[serde(default)]
    pub context: Option<serde_json::Value>,
}

fn default_frontend_source() -> String {
    "frontend".into()
}

fn client_ip(req: &HttpRequest) -> String {
    req.connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string()
}

/// Frontend → API → Loki (sem senha Loki no browser).
pub async fn report_client_error(
    state: web::Data<AppState>,
    limiter: web::Data<ErrorReportRateLimiter>,
    req: HttpRequest,
    body: web::Json<ClientErrorReport>,
) -> HttpResponse {
    if !limiter.check(&client_ip(&req)) {
        return HttpResponse::TooManyRequests().json(json!({
            "status": false,
            "message": "Rate limit exceeded"
        }));
    }

    if body.source.trim() != "frontend" {
        return HttpResponse::BadRequest().json(json!({
            "status": false,
            "message": "Only frontend error reports are accepted"
        }));
    }

    if !state.reporter.is_enabled() {
        return HttpResponse::NoContent().finish();
    }

    let mut parts = vec![redact(&body.message)];
    if let Some(page) = body.page.as_ref().or(body.url.as_ref()) {
        parts.push(format!("Page: {}", redact(page)));
    }
    if let Some(stack) = body.stack.as_ref() {
        parts.push(format!("Stack: {}", redact(stack)));
    }
    if let Some(ctx) = body.context.as_ref() {
        parts.push(format!("Context: {}", redact(&ctx.to_string())));
    }
    if let Some(kind) = body.error_type.as_ref() {
        parts.push(format!("Type: {}", redact(kind)));
    }

    state
        .reporter
        .report_with_source("frontend", parts.join("\n"));
    HttpResponse::NoContent().finish()
}
