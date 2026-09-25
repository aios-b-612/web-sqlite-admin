use crate::error::ApiError;
use actix_web::{http::header, HttpRequest};
use hex::encode as hex_encode;
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

/// Autenticação do painel sidecar: token HMAC derivado de `PASSWORD`.
/// Opcionalmente aceita Bearer via introspect do web-auth (modo PaaS futuro).
#[derive(Clone)]
pub struct Authenticator {
    admin_password: String,
    session_secret: String,
    introspect: Option<IntrospectClient>,
}

#[derive(Clone)]
struct IntrospectClient {
    client: reqwest::Client,
    url: String,
}

#[derive(Debug, Clone, Default)]
pub struct AuthUser {
    pub user_uuid: Option<String>,
    pub company_uuid: Option<String>,
    pub via: AuthVia,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum AuthVia {
    #[default]
    PanelPassword,
    WebAuth,
}

impl Authenticator {
    pub fn new(
        admin_password: String,
        session_secret: String,
        introspect_url: Option<String>,
        timeout: std::time::Duration,
    ) -> Result<Self, reqwest::Error> {
        let introspect = match introspect_url {
            Some(url) => Some(IntrospectClient {
                client: reqwest::Client::builder().timeout(timeout).build()?,
                url,
            }),
            None => None,
        };
        Ok(Self {
            admin_password,
            session_secret,
            introspect,
        })
    }

    pub fn issue_token(&self) -> String {
        let exp = now_secs() + 12 * 3600;
        let payload = format!("sqlite-admin|{exp}");
        let sig = sign(&self.session_secret, &payload);
        format!("{payload}|{sig}")
    }

    pub fn verify_password(&self, password: &str) -> bool {
        constant_time_eq(password.as_bytes(), self.admin_password.as_bytes())
    }

    pub async fn authenticate(&self, request: &HttpRequest) -> Result<AuthUser, ApiError> {
        let token = bearer_token(request).ok_or(ApiError::Unauthorized)?;

        if self.verify_panel_token(token) {
            return Ok(AuthUser {
                via: AuthVia::PanelPassword,
                ..Default::default()
            });
        }

        if let Some(client) = &self.introspect {
            return client.introspect(token).await;
        }

        Err(ApiError::Unauthorized)
    }

    fn verify_panel_token(&self, token: &str) -> bool {
        let mut parts = token.split('|');
        let Some(kind) = parts.next() else {
            return false;
        };
        let Some(exp_str) = parts.next() else {
            return false;
        };
        let Some(sig) = parts.next() else {
            return false;
        };
        if parts.next().is_some() || kind != "sqlite-admin" {
            return false;
        }
        let Ok(exp) = exp_str.parse::<u64>() else {
            return false;
        };
        if now_secs() > exp {
            return false;
        }
        let payload = format!("{kind}|{exp_str}");
        let expected = sign(&self.session_secret, &payload);
        constant_time_eq(sig.as_bytes(), expected.as_bytes())
    }
}

impl IntrospectClient {
    async fn introspect(&self, token: &str) -> Result<AuthUser, ApiError> {
        #[derive(serde::Deserialize)]
        struct IntrospectionResponse {
            status: bool,
            #[serde(default)]
            data: Option<IntrospectionData>,
        }
        #[derive(serde::Deserialize, Default)]
        struct IntrospectionData {
            #[serde(default)]
            user_uuid: Option<String>,
            #[serde(default)]
            company_uuid: Option<String>,
        }

        let response = self
            .client
            .get(&self.url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|error| {
                tracing::warn!(error = %error, "falha ao consultar autenticação");
                ApiError::AuthUnavailable
            })?;

        if response.status() == reqwest::StatusCode::UNAUTHORIZED
            || response.status() == reqwest::StatusCode::FORBIDDEN
        {
            return Err(ApiError::Unauthorized);
        }
        if !response.status().is_success() {
            return Err(ApiError::AuthUnavailable);
        }

        let body: IntrospectionResponse = response
            .json()
            .await
            .map_err(|_| ApiError::AuthUnavailable)?;
        if !body.status {
            return Err(ApiError::Unauthorized);
        }
        let data = body.data.unwrap_or_default();
        Ok(AuthUser {
            user_uuid: data.user_uuid,
            company_uuid: data.company_uuid,
            via: AuthVia::WebAuth,
        })
    }
}

fn bearer_token(request: &HttpRequest) -> Option<&str> {
    request
        .headers()
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
}

fn sign(secret: &str, payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(b"|");
    hasher.update(payload.as_bytes());
    hex_encode(hasher.finalize())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test::TestRequest;

    #[test]
    fn token_redondo() {
        let auth = Authenticator::new(
            "segredo".into(),
            "session".into(),
            None,
            std::time::Duration::from_secs(1),
        )
        .unwrap();
        let token = auth.issue_token();
        assert!(auth.verify_panel_token(&token));
        assert!(!auth.verify_panel_token("sqlite-admin|1|x"));
    }

    #[test]
    fn extrai_bearer() {
        let request = TestRequest::default()
            .insert_header((header::AUTHORIZATION, "Bearer abc"))
            .to_http_request();
        assert_eq!(bearer_token(&request), Some("abc"));
    }
}
