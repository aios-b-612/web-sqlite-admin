use crate::AppState;
use actix_web::{http::header, web, HttpResponse};

fn standard_health_response(service: &str, ready: bool) -> HttpResponse {
    let mut response = if ready {
        HttpResponse::Ok()
    } else {
        HttpResponse::ServiceUnavailable()
    };

    response
        .insert_header((header::CACHE_CONTROL, "no-store"))
        .json(serde_json::json!({
            "status": if ready { "ok" } else { "not_ready" },
            "service": service
        }))
}

pub async fn health_live(state: web::Data<AppState>) -> HttpResponse {
    standard_health_response(&state.service_name, true)
}

pub async fn health_ready(state: web::Data<AppState>) -> HttpResponse {
    match state.store.ping() {
        Ok(()) => standard_health_response(&state.service_name, true),
        Err(error) => {
            tracing::error!(error = %error, "readiness SQLite falhou");
            state.reporter.report(format!("readiness SQLite: {error}"));
            standard_health_response(&state.service_name, false)
        }
    }
}
