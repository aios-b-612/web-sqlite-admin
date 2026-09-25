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
