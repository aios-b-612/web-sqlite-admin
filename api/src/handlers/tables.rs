use crate::{db, error::ApiError, AppState};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct TablePath {
    pub name: String,
    pub table: String,
}

#[derive(Deserialize)]
pub struct BrowseQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub q: Option<String>,
    pub column: Option<String>,
}

fn default_limit() -> i64 {
    50
}

pub async fn list_tables(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<(String,)>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let (name,) = path.into_inner();
    let conn = state.store.open(&name)?;
    let tables = db::list_tables(&conn)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "tables": tables,
    })))
}

pub async fn table_schema(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<TablePath>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let TablePath { name, table } = path.into_inner();
    let conn = state.store.open(&name)?;
    let columns = db::table_columns(&conn, &table)?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "table": table,
        "columns": columns,
    })))
}

pub async fn browse_rows(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<TablePath>,
    query: web::Query<BrowseQuery>,
) -> Result<HttpResponse, ApiError> {
    state.auth.authenticate(&req).await?;
    let TablePath { name, table } = path.into_inner();
    let conn = state.store.open(&name)?;
    let result = db::browse_rows_filtered(
        &conn,
        &table,
        query.limit,
        query.offset,
        query.q.as_deref(),
        query.column.as_deref(),
    )?;
    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "table": table,
        "columns": result.columns,
        "rows": result.rows,
        "total": result.total,
        "limit": result.limit,
        "offset": result.offset,
        "q": query.q,
        "column": query.column,
    })))
}
