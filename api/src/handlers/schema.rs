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

#[derive(Deserialize)]
pub struct ImportBody {
    pub sql: String,
}

#[derive(Deserialize)]
pub struct ObjectsQuery {
    pub kind: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateIndexBody {
    pub name: String,
    pub table: String,
    pub columns: Vec<String>,
    #[serde(default)]
    pub unique: bool,
}

#[derive(Deserialize)]
pub struct DropNamedBody {
    pub name: String,
}

#[derive(Deserialize)]
pub struct CreateViewBody {
    pub name: String,
    pub select_sql: String,
}

#[derive(Deserialize)]
pub struct CreateTriggerBody {
    pub sql: String,
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

pub async fn import_sql(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<ImportBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    let result = db::import_sql(&conn, &body.sql)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "result": result,
    })))
}

pub async fn list_objects(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    query: web::Query<ObjectsQuery>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    let objects = db::list_schema_objects(&conn, query.kind.as_deref())?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "objects": objects,
    })))
}

pub async fn create_index(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<CreateIndexBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::create_index(&conn, &body.name, &body.table, &body.columns, body.unique)?;
    Ok(HttpResponse::Created().json(json!({ "status": true })))
}

pub async fn drop_index(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<DropNamedBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::drop_index(&conn, &body.name)?;
    Ok(HttpResponse::Ok().json(json!({ "status": true })))
}

pub async fn create_view(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<CreateViewBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::create_view(&conn, &body.name, &body.select_sql)?;
    Ok(HttpResponse::Created().json(json!({ "status": true })))
}

pub async fn drop_view(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<DropNamedBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::drop_view(&conn, &body.name)?;
    Ok(HttpResponse::Ok().json(json!({ "status": true })))
}

pub async fn create_trigger(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<CreateTriggerBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::create_trigger(&conn, &body.sql)?;
    Ok(HttpResponse::Created().json(json!({ "status": true })))
}

pub async fn drop_trigger(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<DbPath>,
    body: web::Json<DropNamedBody>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let conn = state.store.open(&path.name)?;
    db::drop_trigger(&conn, &body.name)?;
    Ok(HttpResponse::Ok().json(json!({ "status": true })))
}

fn dump_filename(name: &str) -> String {
    let stem = name.rsplit_once('.').map(|(s, _)| s).unwrap_or(name);
    format!("{stem}-dump.sql")
}
