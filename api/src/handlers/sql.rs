use crate::{db, error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct SqlPath {
    pub name: String,
}

#[derive(Deserialize)]
pub struct SqlBody {
    pub sql: String,
}

pub async fn run_sql(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<SqlPath>,
    body: web::Json<SqlBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let name = path.name.clone();
    let conn = state.store.open(&name)?;
    let result = db::execute_sql(&conn, &body.sql)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "result": result,
    })))
}
