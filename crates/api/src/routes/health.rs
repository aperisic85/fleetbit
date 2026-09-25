use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use shared::db::queries::health as db;

use crate::{error::ApiResult, state::AppState};

pub async fn system_health(
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let stations = db::get_station_health(&state.pool).await?;
    let now = Utc::now();

    let items: Vec<_> = stations.into_iter().map(|s| {
        let age_seconds = s.last_message_at
            .map(|t| (now - t).num_seconds().max(0))
            .unwrap_or(i64::MAX);

        let status = if !s.connected || now - s.last_health_at > Duration::seconds(120) {
            "offline"
        } else if age_seconds > 90 || s.parse_yield_pct < 50.0 {
            "degraded"
        } else {
            "online"
        };

        serde_json::json!({
            "station_id": s.station_id,
            "name": s.name,
            "addr": s.addr,
            "status": status,
            "connected": s.connected,
            "last_message_at": s.last_message_at,
            "last_health_at": s.last_health_at,
            "age_seconds": if age_seconds == i64::MAX { serde_json::Value::Null } else { serde_json::json!(age_seconds) },
            "received_lines": s.received_lines,
            "parsed_messages": s.parsed_messages,
            "position_messages": s.position_messages,
            "static_messages": s.static_messages,
            "aton_messages": s.aton_messages,
            "meteo_messages": s.meteo_messages,
            "parse_yield_pct": s.parse_yield_pct,
            "last_error": s.last_error,
        })
    }).collect();

    let online = items.iter().filter(|v| v["status"] == "online").count();
    let degraded = items.iter().filter(|v| v["status"] == "degraded").count();
    let offline = items.iter().filter(|v| v["status"] == "offline").count();

    Ok(Json(serde_json::json!({
        "status": if offline > 0 || degraded > 0 { "degraded" } else { "ok" },
        "api": "ok",
        "database": "ok",
        "stations_total": items.len(),
        "stations_online": online,
        "stations_degraded": degraded,
        "stations_offline": offline,
        "stations": items
    })))
}
