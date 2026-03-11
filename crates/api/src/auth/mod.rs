use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use shared::models::user::UserRole;
use uuid::Uuid;

pub const TOKEN_EXPIRY_HOURS: i64 = 24;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub role: UserRole,
    pub exp: usize,
}

pub struct JwtSecret(pub String);

impl JwtSecret {
    pub fn encoding_key(&self) -> EncodingKey {
        EncodingKey::from_secret(self.0.as_bytes())
    }

    pub fn decoding_key(&self) -> DecodingKey {
        DecodingKey::from_secret(self.0.as_bytes())
    }
}

pub fn create_token(claims: &Claims, secret: &JwtSecret) -> anyhow::Result<String> {
    let token = encode(&Header::default(), claims, &secret.encoding_key())?;
    Ok(token)
}

pub fn verify_token(token: &str, secret: &JwtSecret) -> anyhow::Result<Claims> {
    let data = decode::<Claims>(token, &secret.decoding_key(), &Validation::default())?;
    Ok(data.claims)
}

/// Axum extractor — izvlači autentificiranog korisnika iz Authorization headera.
/// Vraća 401 ako token nedostaje ili nije valjan.
pub struct AuthUser(pub Claims);

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let jwt_secret = parts
            .extensions
            .get::<std::sync::Arc<JwtSecret>>()
            .ok_or(AuthError::MissingSecret)?;

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(AuthError::MissingToken)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AuthError::InvalidToken)?;

        let claims = verify_token(token, jwt_secret).map_err(|_| AuthError::InvalidToken)?;
        Ok(AuthUser(claims))
    }
}

/// Isti extractor ali ne zahtjeva auth — koristi se za gostujuće rute
pub struct OptionalAuthUser(pub Option<Claims>);

impl<S> FromRequestParts<S> for OptionalAuthUser
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let jwt_secret = match parts.extensions.get::<std::sync::Arc<JwtSecret>>() {
            Some(s) => s,
            None => return Ok(OptionalAuthUser(None)),
        };

        let claims = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .and_then(|t| verify_token(t, jwt_secret).ok());

        Ok(OptionalAuthUser(claims))
    }
}

#[derive(Debug)]
pub enum AuthError {
    MissingToken,
    InvalidToken,
    MissingSecret,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let msg = match self {
            AuthError::MissingToken => "Token nije priložen",
            AuthError::InvalidToken => "Token nije valjan ili je istekao",
            AuthError::MissingSecret => "Konfiguracijska greška servera",
        };
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": msg })),
        )
            .into_response()
    }
}
