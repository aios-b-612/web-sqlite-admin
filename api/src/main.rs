use actix_cors::Cors;
use actix_web::{http::header, web, App, HttpServer};
use anyhow::{Context, Result};
use tracing_actix_web::TracingLogger;
use tracing_subscriber::EnvFilter;

mod auth;
mod config;
mod db;
mod error;
mod handlers;
mod observability;

use auth::Authenticator;
use config::Config;
use db::SqliteStore;
use handlers::error_report::ErrorReportRateLimiter;
use observability::ErrorReporter;

#[derive(Clone)]
pub struct AppState {
    pub store: SqliteStore,
    pub auth: Authenticator,
    pub reporter: ErrorReporter,
    pub service_name: String,
}

#[actix_web::main]
async fn main() -> Result<()> {
    init_tracing();
    let config = Config::from_env()?;
    let store = SqliteStore::new(config.sqlite_dir.clone());
    store
        .ensure_dir()
        .map_err(|e| anyhow::anyhow!("{e}"))
        .context("diretório SQLite")?;

    let auth = Authenticator::new(
        config.admin_password.clone(),
        config.session_secret.clone(),
        config.auth_introspect_url.clone(),
        config.auth_timeout,
    )
    .context("cliente de autenticação")?;

    let state = AppState {
        store,
        auth,
        reporter: ErrorReporter::new(config.loki.clone(), config.environment.clone()),
        service_name: config.service_name.clone(),
    };
    let limiter = web::Data::new(ErrorReportRateLimiter::default());
    let bind_address = config.bind_address.clone();
    let origins = config.allowed_cors_origins.clone();

    tracing::info!(
        %bind_address,
        service = %config.service_name,
        sqlite_dir = %config.sqlite_dir.display(),
        "iniciando API web-sqlite-admin"
    );

    HttpServer::new(move || {
        let allowed_origins = origins.clone();
        let cors = Cors::default()
            .allowed_origin_fn(move |origin, _| {
                origin
                    .to_str()
                    .ok()
                    .is_some_and(|value| allowed_origins.iter().any(|item| item == value))
            })
            .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::ACCEPT,
                header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(state.clone()))
            .app_data(limiter.clone())
            .wrap(cors)
            .wrap(TracingLogger::default())
            .route("/health/live", web::get().to(handlers::health::health_live))
            .route(
                "/health/ready",
                web::get().to(handlers::health::health_ready),
            )
            .service(
                web::scope("/v1")
                    .route("/health/live", web::get().to(handlers::health::health_live))
                    .route(
                        "/health/ready",
                        web::get().to(handlers::health::health_ready),
                    )
                    .route(
                        "/errors/report",
                        web::post().to(handlers::error_report::report_client_error),
                    )
                    .route("/auth/login", web::post().to(handlers::auth::login))
                    .route("/auth/me", web::get().to(handlers::auth::me))
                    .route(
                        "/databases",
                        web::get().to(handlers::database::list_databases),
                    )
                    .route(
                        "/databases",
                        web::post().to(handlers::database::create_database),
                    )
                    .route(
                        "/databases/{name}",
                        web::get().to(handlers::database::get_database),
                    )
                    .route(
                        "/databases/{name}",
                        web::patch().to(handlers::database::rename_database),
                    )
                    .route(
                        "/databases/{name}",
                        web::delete().to(handlers::database::delete_database),
                    )
                    .route(
                        "/databases/{name}/vacuum",
                        web::post().to(handlers::database::vacuum_database),
                    )
                    .route(
                        "/databases/{name}/integrity",
                        web::get().to(handlers::database::integrity_database),
                    )
                    .route(
                        "/databases/{name}/tables",
                        web::get().to(handlers::tables::list_tables),
                    )
                    .route(
                        "/databases/{name}/tables/{table}/schema",
                        web::get().to(handlers::tables::table_schema),
                    )
                    .route(
                        "/databases/{name}/tables/{table}/rows",
                        web::get().to(handlers::tables::browse_rows),
                    )
                    .route(
                        "/databases/{name}/tables/{table}/rows",
                        web::post().to(handlers::rows::insert_row),
                    )
                    .route(
                        "/databases/{name}/tables/{table}/rows",
                        web::patch().to(handlers::rows::update_row),
                    )
                    .route(
                        "/databases/{name}/tables/{table}/rows",
                        web::delete().to(handlers::rows::delete_row),
                    )
                    .route(
                        "/databases/{name}/schema/tables",
                        web::post().to(handlers::schema::create_table),
                    )
                    .route(
                        "/databases/{name}/schema/tables",
                        web::delete().to(handlers::schema::drop_table),
                    )
                    .route(
                        "/databases/{name}/schema/columns",
                        web::post().to(handlers::schema::add_column),
                    )
                    .route(
                        "/databases/{name}/export.sql",
                        web::get().to(handlers::schema::export_sql),
                    )
                    .route(
                        "/databases/{name}/import",
                        web::post().to(handlers::schema::import_sql),
                    )
                    .route(
                        "/databases/{name}/objects",
                        web::get().to(handlers::schema::list_objects),
                    )
                    .route(
                        "/databases/{name}/schema/indexes",
                        web::post().to(handlers::schema::create_index),
                    )
                    .route(
                        "/databases/{name}/schema/indexes",
                        web::delete().to(handlers::schema::drop_index),
                    )
                    .route(
                        "/databases/{name}/schema/views",
                        web::post().to(handlers::schema::create_view),
                    )
                    .route(
                        "/databases/{name}/schema/views",
                        web::delete().to(handlers::schema::drop_view),
                    )
                    .route(
                        "/databases/{name}/schema/triggers",
                        web::post().to(handlers::schema::create_trigger),
                    )
                    .route(
                        "/databases/{name}/schema/triggers",
                        web::delete().to(handlers::schema::drop_trigger),
                    )
                    .route(
                        "/databases/{name}/sql",
                        web::post().to(handlers::sql::run_sql),
                    ),
            )
    })
    .bind(&bind_address)
    .with_context(|| format!("bind em {bind_address}"))?
    .shutdown_timeout(10)
    .run()
    .await
    .context("servidor HTTP")
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("web_sqlite_admin_api=info,actix_web=info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .json()
        .with_target(false)
        .init();
}
