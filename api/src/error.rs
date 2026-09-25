use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),
    #[error("Access denied")]
    Unauthorized,
    #[error("Não encontrado")]
    NotFound,
    #[error("Serviço de autenticação indisponível")]
    AuthUnavailable,
    #[error("Erro interno")]
    Internal(#[source] anyhow::Error),
}

#[derive(Serialize)]
struct ErrorBody {
    status: bool,
    message: String,
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::AuthUnavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(ErrorBody {
            status: false,
            message: self.to_string(),
        })
    }
}
