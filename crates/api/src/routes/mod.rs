use axum::{routing::get, Router};

use crate::state::AppState;

mod vessels;
mod ws;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest(
            "/api/v1",
            Router::new()
                // GET /api/v1/vessels/live  — sve aktivne pozicije za live kartu
                .route("/vessels/live", get(vessels::live_vessels))
                // GET /api/v1/vessels/:mmsi — statički podaci + zadnja pozicija
                .route("/vessels/{mmsi}", get(vessels::get_vessel))
                // GET /api/v1/vessels/:mmsi/track?from=&to=&limit=
                .route("/vessels/{mmsi}/track", get(vessels::get_track)),
        )
        // WS /ws — real-time stream pozicija
        .route("/ws", get(ws::ws_handler))
}
