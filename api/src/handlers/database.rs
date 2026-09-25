use crate::{db, error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;

pub async fn list_databases(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let databases = state.store.list_databases()?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "dir": state.store.dir().display().to_string(),
        "databases": databases,
    })))
}

#[derive(Deserialize)]
pub struct DbPath {
    pub name: String,
}

pub async fn get_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let name = path.name.clone();
    let file = state.store.resolve(&name)?;
    let size_bytes = std::fs::metadata(&file).map(|m| m.len()).unwrap_or(0);
    let conn = state.store.open(&name)?;
    let stats = db::database_stats(&conn, &name, size_bytes)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "database": stats,
    })))
}

#[derive(Deserialize)]
pub struct CreateDbBody {
    pub name: String,
}

pub async fn create_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<CreateDbBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let mut name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(ApiError::BadRequest("nome é obrigatório".into()));
    }
    if !name.contains('.') {
        name.push_str(".sqlite");
    }
    let path = state.store.resolve(&name)?;
    if path.exists() {
        return Err(ApiError::BadRequest("base já existe".into()));
    }
    let _conn = state.store.open(&name)?;
    Ok(HttpResponse::Created().json(json!({
        "status": true,
        "name": name,
    })))
}

#[derive(Deserialize)]
pub struct RenameDbBody {
    pub to: String,
}

pub async fn rename_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<RenameDbBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    state.store.rename_database(&path.name, &body.to)?;
    let mut to = body.to.trim().to_string();
    if !to.contains('.') {
        to.push_str(".sqlite");
    }
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "name": to,
    })))
}

pub async fn delete_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    state.store.delete_database(&path.name)?;
    Ok(HttpResponse::Ok().json(json!({ "status": true })))
}

pub async fn vacuum_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::vacuum(&conn)?;
    Ok(HttpResponse::Ok().json(json!({ "status": true })))
}

pub async fn integrity_database(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    let result = db::integrity_check(&conn)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "result": result,
        "ok": result.eq_ignore_ascii_case("ok"),
    })))
}
