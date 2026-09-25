use crate::config::LokiConfig;
use regex::Regex;
use serde_json::json;
use std::{
    sync::{Arc, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Clone)]
pub struct ErrorReporter {
    client: reqwest::Client,
    config: Option<Arc<LokiConfig>>,
    environment: String,
}

impl ErrorReporter {
    pub fn new(config: Option<LokiConfig>, environment: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            config: config.map(Arc::new),
            environment,
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.config.is_some()
    }

    pub fn report(&self, message: impl Into<String>) {
        self.report_with_source("backend", message);
    }

    pub fn report_with_source(&self, source: &str, message: impl Into<String>) {
        let Some(config) = self.config.clone() else {
            return;
        };
        let client = self.client.clone();
        let environment = self.environment.clone();
        let source = source.to_string();
        let message = redact(&message.into());

        tokio::spawn(async move {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
                .to_string();
            let payload = json!({
                "streams": [{
                    "stream": {
                        "job": config.job,
                        "app": config.job,
                        "source": source,
                        "level": "error",
                        "environment": environment
                    },
                    "values": [[timestamp, message]]
                }]
            });

            match client
                .post(&config.push_url)
                .basic_auth(&config.user, Some(&config.password))
                .json(&payload)
                .send()
                .await
            {
                Ok(response) if !response.status().is_success() => {
                    tracing::warn!(
                        status = %response.status(),
                        "Loki rejeitou erro estruturado"
                    );
                }
                Err(error) => {
                    tracing::warn!(error = %error, "falha ao enviar erro para Loki");
                }
                Ok(_) => {}
            }
        });
    }
}

pub fn redact(message: &str) -> String {
    static TOKEN_PATTERN: OnceLock<Regex> = OnceLock::new();
    let pattern = TOKEN_PATTERN.get_or_init(|| {
        Regex::new(r"(?i)(authorization\s*[:=]\s*|bearer\s+)\S+").expect("regex de redação válida")
    });
    let redacted = pattern.replace_all(message, "${1}[REDACTED]");
    redacted.chars().take(4_000).collect()
}

#[cfg(test)]
mod tests {
    use super::redact;

    #[test]
    fn redige_tokens() {
        assert_eq!(redact("Bearer abc.def"), "Bearer [REDACTED]");
        assert_eq!(
            redact("Authorization: token-secreto"),
            "Authorization: [REDACTED]"
        );
    }
}
