use crate::error::ApiError;
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde_json::{json, Map, Value};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

const ALLOWED_EXTENSIONS: &[&str] = &["db", "db3", "sqlite", "sqlite3"];

#[derive(Clone)]
pub struct SqliteStore {
    dir: PathBuf,
}

impl SqliteStore {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    pub fn ensure_dir(&self) -> Result<(), ApiError> {
        if self.dir.is_dir() {
            return Ok(());
        }
        fs::create_dir_all(&self.dir).map_err(|e| {
            ApiError::Internal(anyhow::anyhow!(
                "criar diretório SQLite {}: {e}",
                self.dir.display()
            ))
        })
    }

    pub fn list_databases(&self) -> Result<Vec<DatabaseInfo>, ApiError> {
        self.ensure_dir()?;
        let mut out = Vec::new();
        let entries = fs::read_dir(&self.dir)
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("ler {}: {e}", self.dir.display())))?;
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
                continue;
            };
            if !ALLOWED_EXTENSIONS
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
            {
                continue;
            }
            let meta = entry.metadata().ok();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default()
                .to_string();
            out.push(DatabaseInfo {
                name,
                size_bytes: meta.as_ref().map(|m| m.len()).unwrap_or(0),
            });
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(out)
    }

    pub fn open(&self, name: &str) -> Result<Connection, ApiError> {
        let path = self.resolve(name)?;
        Connection::open_with_flags(
            &path,
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|e| ApiError::BadRequest(format!("abrir {name}: {e}")))
    }

    pub fn resolve(&self, name: &str) -> Result<PathBuf, ApiError> {
        if name.trim().is_empty() {
            return Err(ApiError::BadRequest("nome da base é obrigatório".into()));
        }
        if name.contains('/') || name.contains('\\') || name.contains("..") {
            return Err(ApiError::BadRequest("nome de base inválido".into()));
        }
        let candidate = self.dir.join(name);
        let normalized = normalize_path(&candidate);
        let base = normalize_path(&self.dir);
        if !normalized.starts_with(&base) {
            return Err(ApiError::BadRequest(
                "caminho fora do diretório permitido".into(),
            ));
        }
        let ext = normalized
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        if !ALLOWED_EXTENSIONS
            .iter()
            .any(|allowed| ext.eq_ignore_ascii_case(allowed))
        {
            return Err(ApiError::BadRequest(format!(
                "extensão não permitida (use: {})",
                ALLOWED_EXTENSIONS.join(", ")
            )));
        }
        Ok(normalized)
    }

    pub fn ping(&self) -> Result<(), ApiError> {
        self.ensure_dir()?;
        let _ = fs::read_dir(&self.dir)
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("readiness SQLite dir: {e}")))?;
        Ok(())
    }
}

#[derive(Debug, serde::Serialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size_bytes: u64,
}

pub fn list_tables(conn: &Connection) -> Result<Vec<TableInfo>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT name, type, sql FROM sqlite_master \
             WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' \
             ORDER BY type, name",
        )
        .map_err(map_sqlite)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TableInfo {
                name: row.get(0)?,
                kind: row.get(1)?,
                sql: row.get(2)?,
            })
        })
        .map_err(map_sqlite)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(map_sqlite)?);
    }
    Ok(out)
}

#[derive(Debug, serde::Serialize)]
pub struct TableInfo {
    pub name: String,
    pub kind: String,
    pub sql: Option<String>,
}

pub fn table_columns(conn: &Connection, table: &str) -> Result<Vec<ColumnInfo>, ApiError> {
    validate_ident(table)?;
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&sql).map_err(map_sqlite)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                cid: row.get(0)?,
                name: row.get(1)?,
                decl_type: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                notnull: row.get::<_, i64>(3)? != 0,
                default_value: row.get(4)?,
                pk: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(map_sqlite)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(map_sqlite)?);
    }
    Ok(out)
}

#[derive(Debug, serde::Serialize)]
pub struct ColumnInfo {
    pub cid: i64,
    pub name: String,
    pub decl_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

pub fn browse_rows(
    conn: &Connection,
    table: &str,
    limit: i64,
    offset: i64,
) -> Result<BrowseResult, ApiError> {
    validate_ident(table)?;
    let limit = limit.clamp(1, 500);
    let offset = offset.max(0);
    let columns = table_columns(conn, table)?;
    let count: i64 = conn
        .query_row(&format!("SELECT COUNT(*) FROM \"{table}\""), [], |row| {
            row.get(0)
        })
        .map_err(map_sqlite)?;

    let sql = format!("SELECT rowid AS __rowid__, * FROM \"{table}\" LIMIT ? OFFSET ?");
    let mut stmt = conn.prepare(&sql).map_err(map_sqlite)?;
    let column_count = stmt.column_count();
    let col_names: Vec<String> = (0..column_count)
        .map(|idx| stmt.column_name(idx).unwrap_or("?").to_string())
        .collect();
    let mut rows_iter = stmt
        .query(rusqlite::params![limit, offset])
        .map_err(map_sqlite)?;
    let mut rows = Vec::new();
    while let Some(row) = rows_iter.next().map_err(map_sqlite)? {
        let mut map = Map::new();
        for (idx, name) in col_names.iter().enumerate() {
            map.insert(
                name.clone(),
                value_ref_to_json(row.get_ref(idx).map_err(map_sqlite)?),
            );
        }
        rows.push(Value::Object(map));
    }

    Ok(BrowseResult {
        columns,
        rows,
        total: count,
        limit,
        offset,
    })
}

#[derive(Debug, serde::Serialize)]
pub struct BrowseResult {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Value>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

pub fn execute_sql(conn: &Connection, sql: &str) -> Result<SqlResult, ApiError> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest("SQL vazio".into()));
    }

    let first = trimmed
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();

    if matches!(first.as_str(), "select" | "pragma" | "with" | "explain") {
        let mut stmt = conn.prepare(trimmed).map_err(map_sqlite)?;
        let column_count = stmt.column_count();
        let mut names = Vec::with_capacity(column_count);
        for idx in 0..column_count {
            names.push(stmt.column_name(idx).unwrap_or("?").to_string());
        }
        let mut rows_iter = stmt.query([]).map_err(map_sqlite)?;
        let mut rows = Vec::new();
        let mut fetched = 0i64;
        while let Some(row) = rows_iter.next().map_err(map_sqlite)? {
            if fetched >= 1000 {
                break;
            }
            let mut map = Map::new();
            for (idx, name) in names.iter().enumerate() {
                map.insert(
                    name.clone(),
                    value_ref_to_json(row.get_ref(idx).map_err(map_sqlite)?),
                );
            }
            rows.push(Value::Object(map));
            fetched += 1;
        }
        return Ok(SqlResult {
            kind: "query".into(),
            columns: names,
            rows,
            changes: 0,
            last_insert_rowid: None,
            truncated: fetched >= 1000,
        });
    }

    let changes = conn.execute(trimmed, []).map_err(map_sqlite)?;
    Ok(SqlResult {
        kind: "exec".into(),
        columns: vec![],
        rows: vec![],
        changes: changes as i64,
        last_insert_rowid: Some(conn.last_insert_rowid()),
        truncated: false,
    })
}

#[derive(Debug, serde::Serialize)]
pub struct SqlResult {
    pub kind: String,
    pub columns: Vec<String>,
    pub rows: Vec<Value>,
    pub changes: i64,
    pub last_insert_rowid: Option<i64>,
    pub truncated: bool,
}

pub fn database_stats(conn: &Connection, name: &str, size_bytes: u64) -> Result<Value, ApiError> {
    let page_count: i64 = conn
        .query_row("PRAGMA page_count", [], |row| row.get(0))
        .unwrap_or(0);
    let page_size: i64 = conn
        .query_row("PRAGMA page_size", [], |row| row.get(0))
        .unwrap_or(0);
    let tables = list_tables(conn)?;
    Ok(json!({
        "name": name,
        "size_bytes": size_bytes,
        "page_count": page_count,
        "page_size": page_size,
        "table_count": tables.len(),
        "tables": tables,
    }))
}

fn value_ref_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(v) => json!(v),
        ValueRef::Real(v) => json!(v),
        ValueRef::Text(v) => Value::String(String::from_utf8_lossy(v).into_owned()),
        ValueRef::Blob(v) => json!({
            "type": "blob",
            "bytes": v.len(),
            "hex_prefix": hex::encode(&v[..v.len().min(32)]),
        }),
    }
}

fn validate_ident(name: &str) -> Result<(), ApiError> {
    if name.is_empty()
        || !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(ApiError::BadRequest(
            "identificador de tabela inválido".into(),
        ));
    }
    Ok(())
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

fn map_sqlite(err: rusqlite::Error) -> ApiError {
    ApiError::BadRequest(err.to_string())
}

fn json_to_sql_param(value: &Value) -> Result<rusqlite::types::Value, ApiError> {
    match value {
        Value::Null => Ok(rusqlite::types::Value::Null),
        Value::Bool(b) => Ok(rusqlite::types::Value::Integer(i64::from(*b))),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(rusqlite::types::Value::Integer(i))
            } else if let Some(f) = n.as_f64() {
                Ok(rusqlite::types::Value::Real(f))
            } else {
                Err(ApiError::BadRequest("número inválido".into()))
            }
        }
        Value::String(s) => Ok(rusqlite::types::Value::Text(s.clone())),
        Value::Array(_) | Value::Object(_) => Ok(rusqlite::types::Value::Text(value.to_string())),
    }
}

pub fn insert_row(
    conn: &Connection,
    table: &str,
    values: &Map<String, Value>,
) -> Result<i64, ApiError> {
    validate_ident(table)?;
    if values.is_empty() {
        return Err(ApiError::BadRequest("values vazio".into()));
    }
    let mut cols = Vec::new();
    let mut placeholders = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();
    for (col, val) in values {
        validate_ident(col)?;
        cols.push(format!("\"{col}\""));
        placeholders.push("?");
        params.push(json_to_sql_param(val)?);
    }
    let sql = format!(
        "INSERT INTO \"{table}\" ({}) VALUES ({})",
        cols.join(", "),
        placeholders.join(", ")
    );
    conn.execute(&sql, rusqlite::params_from_iter(params.iter()))
        .map_err(map_sqlite)?;
    Ok(conn.last_insert_rowid())
}

pub fn update_row(
    conn: &Connection,
    table: &str,
    rowid: i64,
    values: &Map<String, Value>,
) -> Result<i64, ApiError> {
    validate_ident(table)?;
    if values.is_empty() {
        return Err(ApiError::BadRequest("values vazio".into()));
    }
    let mut sets = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();
    for (col, val) in values {
        if col == "__rowid__" || col.eq_ignore_ascii_case("rowid") {
            continue;
        }
        validate_ident(col)?;
        sets.push(format!("\"{col}\" = ?"));
        params.push(json_to_sql_param(val)?);
    }
    if sets.is_empty() {
        return Err(ApiError::BadRequest("nenhuma coluna para atualizar".into()));
    }
    params.push(rusqlite::types::Value::Integer(rowid));
    let sql = format!("UPDATE \"{table}\" SET {} WHERE rowid = ?", sets.join(", "));
    let changes = conn
        .execute(&sql, rusqlite::params_from_iter(params.iter()))
        .map_err(map_sqlite)?;
    Ok(changes as i64)
}

pub fn delete_row(conn: &Connection, table: &str, rowid: i64) -> Result<i64, ApiError> {
    validate_ident(table)?;
    let changes = conn
        .execute(
            &format!("DELETE FROM \"{table}\" WHERE rowid = ?"),
            rusqlite::params![rowid],
        )
        .map_err(map_sqlite)?;
    Ok(changes as i64)
}

#[derive(Debug, serde::Deserialize)]
pub struct ColumnDef {
    pub name: String,
    #[serde(default = "default_col_type")]
    pub decl_type: String,
    #[serde(default)]
    pub primary_key: bool,
    #[serde(default)]
    pub notnull: bool,
    #[serde(default)]
    pub unique: bool,
}

fn default_col_type() -> String {
    "TEXT".into()
}

pub fn create_table(conn: &Connection, name: &str, columns: &[ColumnDef]) -> Result<(), ApiError> {
    validate_ident(name)?;
    if columns.is_empty() {
        return Err(ApiError::BadRequest("defina ao menos uma coluna".into()));
    }
    let mut parts = Vec::new();
    for col in columns {
        validate_ident(&col.name)?;
        let mut part = format!("\"{}\" {}", col.name, col.decl_type.trim());
        if col.primary_key {
            part.push_str(" PRIMARY KEY");
        }
        if col.notnull {
            part.push_str(" NOT NULL");
        }
        if col.unique {
            part.push_str(" UNIQUE");
        }
        parts.push(part);
    }
    let sql = format!("CREATE TABLE \"{name}\" ({})", parts.join(", "));
    conn.execute(&sql, []).map_err(map_sqlite)?;
    Ok(())
}

pub fn drop_table(conn: &Connection, name: &str) -> Result<(), ApiError> {
    validate_ident(name)?;
    conn.execute(&format!("DROP TABLE IF EXISTS \"{name}\""), [])
        .map_err(map_sqlite)?;
    Ok(())
}

pub fn add_column(conn: &Connection, table: &str, column: &ColumnDef) -> Result<(), ApiError> {
    validate_ident(table)?;
    validate_ident(&column.name)?;
    let mut sql = format!(
        "ALTER TABLE \"{table}\" ADD COLUMN \"{}\" {}",
        column.name,
        column.decl_type.trim()
    );
    if column.notnull {
        sql.push_str(" NOT NULL");
    }
    conn.execute(&sql, []).map_err(map_sqlite)?;
    Ok(())
}

pub fn export_sql(conn: &Connection) -> Result<String, ApiError> {
    let mut out = String::from("-- Octor web-sqlite-admin dump\nBEGIN TRANSACTION;\n");
    let mut stmt = conn
        .prepare(
            "SELECT type, name, sql FROM sqlite_master \
             WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' \
             ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name",
        )
        .map_err(map_sqlite)?;
    let schema_rows: Vec<(String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(map_sqlite)?
        .collect::<Result<_, _>>()
        .map_err(map_sqlite)?;

    for (kind, name, sql) in &schema_rows {
        out.push_str(sql);
        out.push_str(";\n");
        if kind != "table" {
            continue;
        }
        validate_ident(name)?;
        let mut data = conn
            .prepare(&format!("SELECT * FROM \"{name}\""))
            .map_err(map_sqlite)?;
        let col_count = data.column_count();
        let col_names: Vec<String> = (0..col_count)
            .map(|i| data.column_name(i).unwrap_or("?").to_string())
            .collect();
        let mut rows = data.query([]).map_err(map_sqlite)?;
        while let Some(row) = rows.next().map_err(map_sqlite)? {
            let mut vals = Vec::new();
            for i in 0..col_count {
                vals.push(sql_literal(row.get_ref(i).map_err(map_sqlite)?));
            }
            out.push_str(&format!(
                "INSERT INTO \"{name}\" ({}) VALUES ({});\n",
                col_names
                    .iter()
                    .map(|c| format!("\"{c}\""))
                    .collect::<Vec<_>>()
                    .join(", "),
                vals.join(", ")
            ));
        }
    }
    out.push_str("COMMIT;\n");
    Ok(out)
}

fn sql_literal(value: ValueRef<'_>) -> String {
    match value {
        ValueRef::Null => "NULL".into(),
        ValueRef::Integer(v) => v.to_string(),
        ValueRef::Real(v) => {
            let s = v.to_string();
            if s.contains('e') || s.contains('E') || s.contains('.') {
                s
            } else {
                format!("{s}.0")
            }
        }
        ValueRef::Text(v) => {
            let text = String::from_utf8_lossy(v);
            format!("'{}'", text.replace('\'', "''"))
        }
        ValueRef::Blob(v) => format!("X'{}'", hex::encode(v)),
    }
}

const MAX_IMPORT_BYTES: usize = 8 * 1024 * 1024;

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub statements_ok: bool,
    pub bytes: usize,
}

/// Executa um dump SQL (várias statements). Limite 8 MiB.
pub fn import_sql(conn: &Connection, sql: &str) -> Result<ImportResult, ApiError> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest("SQL de import vazio".into()));
    }
    if trimmed.len() > MAX_IMPORT_BYTES {
        return Err(ApiError::BadRequest(format!(
            "import demasiado grande (máx. {MAX_IMPORT_BYTES} bytes)"
        )));
    }
    conn.execute_batch(trimmed).map_err(map_sqlite)?;
    Ok(ImportResult {
        statements_ok: true,
        bytes: trimmed.len(),
    })
}

#[derive(Debug, serde::Serialize)]
pub struct SchemaObject {
    pub name: String,
    pub kind: String,
    pub tbl_name: Option<String>,
    pub sql: Option<String>,
}

pub fn list_schema_objects(
    conn: &Connection,
    kind: Option<&str>,
) -> Result<Vec<SchemaObject>, ApiError> {
    let allowed = ["index", "view", "trigger"];
    if let Some(k) = kind {
        if !allowed.contains(&k) {
            return Err(ApiError::BadRequest(format!(
                "kind inválido (use: {})",
                allowed.join(", ")
            )));
        }
    }

    let mut out = Vec::new();
    if let Some(k) = kind {
        let mut stmt = conn
            .prepare(
                "SELECT name, type, tbl_name, sql FROM sqlite_master \
                 WHERE type = ?1 AND name NOT LIKE 'sqlite_%' ORDER BY name",
            )
            .map_err(map_sqlite)?;
        let rows = stmt
            .query_map(rusqlite::params![k], |row| {
                Ok(SchemaObject {
                    name: row.get(0)?,
                    kind: row.get(1)?,
                    tbl_name: row.get(2)?,
                    sql: row.get(3)?,
                })
            })
            .map_err(map_sqlite)?;
        for row in rows {
            out.push(row.map_err(map_sqlite)?);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT name, type, tbl_name, sql FROM sqlite_master \
                 WHERE type IN ('index','view','trigger') AND name NOT LIKE 'sqlite_%' \
                 ORDER BY type, name",
            )
            .map_err(map_sqlite)?;
        let rows = stmt
            .query_map([], |row| {
                Ok(SchemaObject {
                    name: row.get(0)?,
                    kind: row.get(1)?,
                    tbl_name: row.get(2)?,
                    sql: row.get(3)?,
                })
            })
            .map_err(map_sqlite)?;
        for row in rows {
            out.push(row.map_err(map_sqlite)?);
        }
    }
    Ok(out)
}

pub fn create_index(
    conn: &Connection,
    name: &str,
    table: &str,
    columns: &[String],
    unique: bool,
) -> Result<(), ApiError> {
    validate_ident(name)?;
    validate_ident(table)?;
    if columns.is_empty() {
        return Err(ApiError::BadRequest("colunas do índice vazias".into()));
    }
    for col in columns {
        validate_ident(col)?;
    }
    let uniq = if unique { "UNIQUE " } else { "" };
    let cols = columns
        .iter()
        .map(|c| format!("\"{c}\""))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!("CREATE {uniq}INDEX \"{name}\" ON \"{table}\" ({cols})");
    conn.execute(&sql, []).map_err(map_sqlite)?;
    Ok(())
}

pub fn drop_index(conn: &Connection, name: &str) -> Result<(), ApiError> {
    validate_ident(name)?;
    conn.execute(&format!("DROP INDEX IF EXISTS \"{name}\""), [])
        .map_err(map_sqlite)?;
    Ok(())
}

pub fn create_view(conn: &Connection, name: &str, select_sql: &str) -> Result<(), ApiError> {
    validate_ident(name)?;
    let select = select_sql.trim();
    if select.is_empty() {
        return Err(ApiError::BadRequest("SQL da view vazio".into()));
    }
    let first = select
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    if first != "select" && first != "with" {
        return Err(ApiError::BadRequest(
            "view deve começar com SELECT ou WITH".into(),
        ));
    }
    let sql = format!("CREATE VIEW \"{name}\" AS {select}");
    conn.execute(&sql, []).map_err(map_sqlite)?;
    Ok(())
}

pub fn drop_view(conn: &Connection, name: &str) -> Result<(), ApiError> {
    validate_ident(name)?;
    conn.execute(&format!("DROP VIEW IF EXISTS \"{name}\""), [])
        .map_err(map_sqlite)?;
    Ok(())
}

pub fn create_trigger(conn: &Connection, create_sql: &str) -> Result<(), ApiError> {
    let trimmed = create_sql.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest("SQL do trigger vazio".into()));
    }
    let lower = trimmed.to_ascii_lowercase();
    if !lower.starts_with("create trigger") && !lower.starts_with("create temporary trigger") {
        return Err(ApiError::BadRequest(
            "use um statement CREATE TRIGGER completo".into(),
        ));
    }
    conn.execute(trimmed, []).map_err(map_sqlite)?;
    Ok(())
}

pub fn drop_trigger(conn: &Connection, name: &str) -> Result<(), ApiError> {
    validate_ident(name)?;
    conn.execute(&format!("DROP TRIGGER IF EXISTS \"{name}\""), [])
        .map_err(map_sqlite)?;
    Ok(())
}

#[cfg(test)]
mod crud_tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn insert_update_delete_roundtrip() {
        let conn = Connection::open_in_memory().unwrap();
        create_table(
            &conn,
            "items",
            &[
                ColumnDef {
                    name: "id".into(),
                    decl_type: "INTEGER".into(),
                    primary_key: true,
                    notnull: false,
                    unique: false,
                },
                ColumnDef {
                    name: "name".into(),
                    decl_type: "TEXT".into(),
                    primary_key: false,
                    notnull: true,
                    unique: false,
                },
            ],
        )
        .unwrap();
        let mut values = Map::new();
        values.insert("name".into(), json!("alfa"));
        let rowid = insert_row(&conn, "items", &values).unwrap();
        assert!(rowid > 0);
        let mut patch = Map::new();
        patch.insert("name".into(), json!("beta"));
        assert_eq!(update_row(&conn, "items", rowid, &patch).unwrap(), 1);
        let browse = browse_rows(&conn, "items", 10, 0).unwrap();
        assert_eq!(browse.total, 1);
        assert_eq!(browse.rows[0]["name"], json!("beta"));
        assert_eq!(delete_row(&conn, "items", rowid).unwrap(), 1);
        assert_eq!(browse_rows(&conn, "items", 10, 0).unwrap().total, 0);
        let dump = export_sql(&conn).unwrap();
        assert!(dump.contains("CREATE TABLE"));
    }

    #[test]
    fn import_index_view_roundtrip() {
        let conn = Connection::open_in_memory().unwrap();
        import_sql(
            &conn,
            "CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT);\n\
             INSERT INTO t (name) VALUES ('x');\n",
        )
        .unwrap();
        create_index(&conn, "idx_t_name", "t", &["name".into()], false).unwrap();
        create_view(&conn, "v_t", "SELECT id, name FROM t").unwrap();
        let objs = list_schema_objects(&conn, None).unwrap();
        assert!(objs
            .iter()
            .any(|o| o.kind == "index" && o.name == "idx_t_name"));
        assert!(objs.iter().any(|o| o.kind == "view" && o.name == "v_t"));
        drop_index(&conn, "idx_t_name").unwrap();
        drop_view(&conn, "v_t").unwrap();
        assert!(list_schema_objects(&conn, None).unwrap().is_empty());
    }
}
