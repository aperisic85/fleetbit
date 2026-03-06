use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use shared::db::queries::vessels as db;

use crate::{
    error::{ApiError, ApiResult},
    state::AppState,
};

/// Query parametri za track endpoint.
#[derive(Debug, Deserialize)]
pub struct TrackParams {
    /// Početak raspona (ISO 8601). Default: 24h unazad.
    pub from: Option<DateTime<Utc>>,
    /// Kraj raspona (ISO 8601). Default: sada.
    pub to: Option<DateTime<Utc>>,
    /// Maksimalan broj točaka. Default: 5000, max: 10000.
    pub limit: Option<i64>,
}

/// GET /api/v1/vessels/live
/// Zadnja poznata pozicija svakog broda — za inicialni load live karte.
pub async fn live_vessels(
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let vessels = db::get_live_vessels(&state.pool).await?;
    let count = vessels.len();
    Ok(Json(serde_json::json!({ "count": count, "vessels": vessels })))
}

/// GET /api/v1/vessels/:mmsi
/// Statički podaci broda zajedno s zadnjom pozicijom.
pub async fn get_vessel(
    State(state): State<AppState>,
    Path(mmsi): Path<i32>,
) -> ApiResult<Json<serde_json::Value>> {
    let vessel = db::get_vessel(&state.pool, mmsi)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("Brod s MMSI {mmsi} nije pronađen")))?;

    // Dohvati zadnju poziciju
    let live: Vec<_> = db::get_live_vessels(&state.pool)
        .await?
        .into_iter()
        .filter(|v| v.mmsi == mmsi)
        .collect();

    let last_position = live.into_iter().next();

    Ok(Json(serde_json::json!({
        "vessel": vessel,
        "last_position": last_position,
    })))
}

/// GET /api/v1/vessels/:mmsi/track?from=&to=&limit=
/// Historijski trag broda.
pub async fn get_track(
    State(state): State<AppState>,
    Path(mmsi): Path<i32>,
    Query(params): Query<TrackParams>,
) -> ApiResult<Json<serde_json::Value>> {
    let now = Utc::now();
    let from = params.from.unwrap_or_else(|| now - Duration::hours(24));
    let to = params.to.unwrap_or(now);
    let limit = params.limit.unwrap_or(5000).clamp(1, 10_000);

    let track = db::get_vessel_track(&state.pool, mmsi, from, to, limit).await?;

    Ok(Json(serde_json::json!({
        "mmsi": mmsi,
        "from": from,
        "to": to,
        "count": track.len(),
        "track": track,
    })))
}
