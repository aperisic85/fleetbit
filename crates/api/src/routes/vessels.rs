use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use shared::db::queries::vessels as db;

use crate::{
    auth::AuthUser,
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
/// Statički podaci broda zajedno s zadnjom pozicijom. Zahtijeva prijavu.
pub async fn get_vessel(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
    Path(mmsi): Path<i32>,
) -> ApiResult<Json<serde_json::Value>> {
    let vessel = db::get_vessel(&state.pool, mmsi).await?;

    // Dohvati zadnju poziciju
    let live: Vec<_> = db::get_live_vessels(&state.pool)
        .await?
        .into_iter()
        .filter(|v| v.mmsi == mmsi)
        .collect();

    let last_position = live.into_iter().next();

    if vessel.is_none() && last_position.is_none() {
        return Err(ApiError::NotFound(format!("Brod s MMSI {mmsi} nije pronađen")));
    }

    Ok(Json(serde_json::json!({
        "vessel": vessel,
        "last_position": last_position,
    })))
}

/// GET /api/v1/vessels/:mmsi/track?from=&to=&limit=
/// Historijski trag broda. Zahtijeva prijavu.
pub async fn get_track(
    AuthUser(_claims): AuthUser,
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

/// Query parametri za replay snapshot.
#[derive(Debug, Deserialize)]
pub struct SnapshotParams {
    /// Trenutak za koji želimo stanje flote (ISO 8601). Obavezno.
    pub at: DateTime<Utc>,
    /// Koliko minuta unatrag pozicija smije biti da se brod smatra prisutnim.
    /// Default: 30, raspon 1–360.
    pub window: Option<i64>,
}

/// GET /aisapi/v1/replay/snapshot?at=&window=
/// Stanje cijele flote u jednom trenutku — za premotavanje karte unatrag.
/// Zahtijeva prijavu.
pub async fn replay_snapshot(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
    Query(params): Query<SnapshotParams>,
) -> ApiResult<Json<serde_json::Value>> {
    let window = params.window.unwrap_or(30).clamp(1, 360);
    let vessels = db::get_vessels_at(&state.pool, params.at, window).await?;
    Ok(Json(serde_json::json!({
        "at": params.at,
        "window_minutes": window,
        "count": vessels.len(),
        "vessels": vessels,
    })))
}

/// Query parametri za replay range.
#[derive(Debug, Deserialize)]
pub struct ReplayRangeParams {
    /// Početak raspona (ISO 8601). Default: 48h unatrag.
    pub from: Option<DateTime<Utc>>,
    /// Kraj raspona (ISO 8601). Default: sada.
    pub to: Option<DateTime<Utc>>,
    /// Maksimalan broj točaka. Default: 100000, max: 500000.
    pub limit: Option<i64>,
}

/// GET /aisapi/v1/replay/range?from=&to=&limit=
/// Sve pozicije flote u rasponu — sirovi podaci za animirani replay.
/// Garantira dostupnost barem 48h unatrag; raspon je ograničen na 7 dana.
/// Zahtijeva prijavu.
pub async fn replay_range(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
    Query(params): Query<ReplayRangeParams>,
) -> ApiResult<Json<serde_json::Value>> {
    let now = Utc::now();
    let to = params.to.unwrap_or(now);
    // Default: 48h unatrag. Donja granica raspona ograničena na 7 dana
    // da zaštitimo bazu od prevelikih upita.
    let mut from = params.from.unwrap_or_else(|| now - Duration::hours(48));
    let earliest = now - Duration::days(7);
    if from < earliest {
        from = earliest;
    }
    if from > to {
        return Err(ApiError::BadRequest(
            "'from' mora biti prije 'to'".to_string(),
        ));
    }
    let limit = params.limit.unwrap_or(100_000).clamp(1, 500_000);

    let positions = db::get_fleet_positions(&state.pool, from, to, limit).await?;

    Ok(Json(serde_json::json!({
        "from": from,
        "to": to,
        "count": positions.len(),
        "positions": positions,
    })))
}
