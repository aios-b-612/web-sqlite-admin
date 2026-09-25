use crate::{db, error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::{json, Map, Value};

#[derive(Deserialize)]
pub struct TablePath {
    pub name: String,
    pub table: String,
}

#[derive(Deserialize)]
pub struct RowBody {
    pub values: Map<String, Value>,
}

#[derive(Deserialize)]
pub struct UpdateBody {
    pub rowid: i64,
    pub values: Map<String, Value>,
}

#[derive(Deserialize)]
pub struct DeleteBody {
    pub rowid: i64,
}

pub async fn insert_row(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<TablePath>,
    body: web::Json<RowBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let TablePath { name, table } = path.into_inner();
    let conn = state.store.open(&name)?;
    let rowid = db::insert_row(&conn, &table, &body.values)?;
    Ok(HttpResponse::Created().json(json!({
        "status": true,
        "rowid": rowid,
    })))
}

pub async fn update_row(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<TablePath>,
    body: web::Json<UpdateBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let TablePath { name, table } = path.into_inner();
    let conn = state.store.open(&name)?;
    let changes = db::update_row(&conn, &table, body.rowid, &body.values)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "changes": changes,
    })))
}

pub async fn delete_row(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<TablePath>,
    body: web::Json<DeleteBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let TablePath { name, table } = path.into_inner();
    let conn = state.store.open(&name)?;
    let changes = db::delete_row(&conn, &table, body.rowid)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "changes": changes,
    })))
}
