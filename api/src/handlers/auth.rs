use crate::{error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct LoginBody {
    pub password: String,
}

pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginBody>,
) -> Result<HttpResponse, ApiError> {
    if !state.auth.verify_password(&body.password) {
        return Err(ApiError::Unauthorized);
    }
    let token = state.auth.issue_token();
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "token": token,
        "token_type": "Bearer",
        "expires_in": 43200
    })))
}

pub async fn me(state: web::Data<AppState>, req: HttpRequest) -> Result<HttpResponse, ApiError> {
    let user = state.auth.authenticate(&req).await?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "via": format!("{:?}", user.via),
        "user_uuid": user.user_uuid,
        "company_uuid": user.company_uuid,
        "sqlite_dir": state.store.dir().display().to_string(),
    })))
}
