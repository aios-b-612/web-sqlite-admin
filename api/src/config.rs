use anyhow::{bail, Context, Result};
use std::{env, path::PathBuf, time::Duration};

#[derive(Clone, Debug)]
pub struct Config {
    pub bind_address: String,
    /// Diretório com ficheiros `.db` / `.sqlite` (compatível com phpLiteAdmin `LOCATION`).
    pub sqlite_dir: PathBuf,
    /// Senha do painel (compatível com phpLiteAdmin `PASSWORD`).
    pub admin_password: String,
    /// Segredo para assinar tokens de sessão do painel.
    pub session_secret: String,
    pub auth_introspect_url: Option<String>,
    pub auth_timeout: Duration,
    pub allowed_cors_origins: Vec<String>,
    pub environment: String,
    pub service_name: String,
    pub loki: Option<LokiConfig>,
}

#[derive(Clone, Debug)]
pub struct LokiConfig {
    pub push_url: String,
    pub user: String,
    pub password: String,
    pub job: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let _ = dotenvy::dotenv();

        let sqlite_dir = env::var("LOCATION")
            .or_else(|_| env::var("SQLITE_DIR"))
            .unwrap_or_else(|_| "/db/databases".into());
        let sqlite_dir = PathBuf::from(sqlite_dir);
        if sqlite_dir.as_os_str().is_empty() {
            bail!("LOCATION / SQLITE_DIR não pode ser vazio");
        }

        let admin_password = env::var("PASSWORD")
            .or_else(|_| env::var("ADMIN_PASSWORD"))
            .context("PASSWORD (ou ADMIN_PASSWORD) é obrigatório")?;
        if admin_password.trim().is_empty() {
            bail!("PASSWORD não pode ser vazio");
        }

        let session_secret = env::var("SESSION_SECRET").unwrap_or_else(|_| {
            // Sidecar: deriva um segredo estável a partir da senha se não houver SESSION_SECRET.
            format!("octor-sqlite-admin:{admin_password}")
        });

        let auth_introspect_url = optional_env("AUTH_INTROSPECT_URL");
        let allowed_cors_origins = env::var("ALLOWED_CORS_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".into())
            .split(',')
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .collect();

        Ok(Self {
            bind_address: env::var("BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            sqlite_dir,
            admin_password,
            session_secret,
            auth_introspect_url,
            auth_timeout: Duration::from_millis(parse_env("AUTH_TIMEOUT_MS", 2_000)?),
            allowed_cors_origins,
            environment: env::var("APP_ENV")
                .or_else(|_| env::var("ENVIRONMENT"))
                .unwrap_or_else(|_| "production".into()),
            service_name: env::var("OCTOR_SERVICE_NAME")
                .unwrap_or_else(|_| "web-sqlite-admin-api".into()),
            loki: LokiConfig::from_env()?,
        })
    }
}

impl LokiConfig {
    fn from_env() -> Result<Option<Self>> {
        let Some(push_url) = optional_env("LOKI_PUSH_URL") else {
            return Ok(None);
        };

        Ok(Some(Self {
            push_url,
            user: env::var("LOKI_PUSH_USER")
                .context("LOKI_PUSH_USER é obrigatório quando LOKI_PUSH_URL estiver definido")?,
            password: env::var("LOKI_PUSH_PASSWORD").context(
                "LOKI_PUSH_PASSWORD é obrigatório quando LOKI_PUSH_URL estiver definido",
            )?,
            job: env::var("LOKI_JOB").unwrap_or_else(|_| "web-sqlite-admin-api".into()),
        }))
    }
}

fn optional_env(name: &str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.trim().is_empty())
}

fn parse_env<T>(name: &str, default: T) -> Result<T>
where
    T: std::str::FromStr,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    match env::var(name) {
        Ok(value) => value.parse().with_context(|| format!("{name} inválido")),
        Err(_) => Ok(default),
    }
}
