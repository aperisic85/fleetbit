use axum::{extract::State, Json};
use shared::db::queries::atons as db;

use crate::{error::ApiResult, state::AppState};

/// GET /api/v1/atons/live
/// Svi AtoNi s trenutnim statusom.
pub async fn live_atons(
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let atons = db::get_live_atons(&state.pool).await?;
    let count = atons.len();
    Ok(Json(serde_json::json!({ "count": count, "atons": atons })))
}
