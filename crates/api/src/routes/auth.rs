use axum::{Extension, Json, extract::State, http::StatusCode};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use shared::models::user::{User, UserRole};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::{AuthUser, Claims, JwtSecret, TOKEN_EXPIRY_HOURS, create_token},
    error::{ApiError, ApiResult},
    state::AppState,
};

// ── Request / Response DTO-i ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub company_name: Option<String>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserDto,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: Uuid,
    pub email: String,
    pub role: UserRole,
    pub company_name: Option<String>,
}

impl From<User> for UserDto {
    fn from(u: User) -> Self {
        UserDto {
            id: u.id,
            email: u.email,
            role: u.role,
            company_name: u.company_name,
        }
    }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// POST /api/v1/auth/login
pub async fn login(
    State(state): State<AppState>,
    Extension(jwt_secret): Extension<Arc<JwtSecret>>,
    Json(body): Json<LoginRequest>,
) -> ApiResult<Json<AuthResponse>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, company_name, role, created_at, active
         FROM users WHERE email = $1 AND active = true",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| ApiError::Unauthorized("Neispravni podaci za prijavu".into()))?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| ApiError::Internal(anyhow::anyhow!("Hash error")))?;

    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::Unauthorized("Neispravni podaci za prijavu".into()))?;

    let exp = (Utc::now() + chrono::Duration::hours(TOKEN_EXPIRY_HOURS)).timestamp() as usize;
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: user.role.clone(),
        exp,
    };

    let token = create_token(&claims, &jwt_secret)
        .map_err(|e| ApiError::Internal(e))?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

/// POST /api/v1/auth/register  (samo za nove klijente / charter kompanije)
pub async fn register(
    State(state): State<AppState>,
    Extension(jwt_secret): Extension<Arc<JwtSecret>>,
    Json(body): Json<RegisterRequest>,
) -> ApiResult<(StatusCode, Json<AuthResponse>)> {
    // Provjeri postoji li email
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(&body.email)
        .fetch_one(&state.pool)
        .await?;

    if exists {
        return Err(ApiError::Conflict("Email je već registriran".into()));
    }

    // Hash lozinke
    let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let hash = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("Hash error: {e}")))?
        .to_string();

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, company_name, role)
         VALUES ($1, $2, $3, 'client')
         RETURNING id, email, password_hash, company_name, role, created_at, active",
    )
    .bind(&body.email)
    .bind(&hash)
    .bind(&body.company_name)
    .fetch_one(&state.pool)
    .await?;

    let exp = (Utc::now() + chrono::Duration::hours(TOKEN_EXPIRY_HOURS)).timestamp() as usize;
    let claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: user.role.clone(),
        exp,
    };

    let token = create_token(&claims, &jwt_secret)
        .map_err(|e| ApiError::Internal(e))?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: user.into(),
        }),
    ))
}

/// GET /api/v1/auth/me — vraća podatke prijavljenog korisnika
pub async fn me(
    State(state): State<AppState>,
    AuthUser(claims): AuthUser,
) -> ApiResult<Json<UserDto>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, company_name, role, created_at, active
         FROM users WHERE id = $1 AND active = true",
    )
    .bind(claims.sub)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| ApiError::NotFound("Korisnik nije pronađen".into()))?;

    Ok(Json(user.into()))
}
