use crate::{db, error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct DbPath {
    pub name: String,
}

#[derive(Deserialize)]
pub struct CreateTableBody {
    pub table: String,
    pub columns: Vec<db::ColumnDef>,
}

#[derive(Deserialize)]
pub struct DropTableBody {
    pub table: String,
}

#[derive(Deserialize)]
pub struct AddColumnBody {
    pub table: String,
    pub column: db::ColumnDef,
}

pub async fn create_table(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<CreateTableBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::create_table(&conn, &body.table, &body.columns)?;
    Ok(HttpResponse::Created().json(json!({
        "status": true,
        "table": body.table,
    })))
}

pub async fn drop_table(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<DropTableBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::drop_table(&conn, &body.table)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
    })))
}

pub async fn add_column(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<AddColumnBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::add_column(&conn, &body.table, &body.column)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
    })))
}

pub async fn export_sql(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    let sql = db::export_sql(&conn)?;
    Ok(HttpResponse::Ok()
        .insert_header((
            actix_web::http::header::CONTENT_TYPE,
            "application/sql; charset=utf-8",
        ))
        .insert_header((
            actix_web::http::header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", dump_filename(&path.name)),
        ))
        .body(sql))
}

fn dump_filename(name: &str) -> String {
    let stem = name.rsplit_once('.').map(|(s, _)| s).unwrap_or(name);
    format!("{stem}-dump.sql")
}
