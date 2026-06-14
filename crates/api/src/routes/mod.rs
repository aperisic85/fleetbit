use axum::{
    routing::{get, post},
    Router,
};

use crate::state::AppState;

mod atons;
mod auth;
mod vessels;
mod ws;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest(
            "/aisapi/v1",
            Router::new()
                // ── Auth (javne rute) ─────────────────────────────────────
                .route("/auth/login", post(auth::login))
                .route("/auth/register", post(auth::register))
                .route("/auth/me", get(auth::me))
                // ── Javno: live pozicije (gosti vide kartu) ───────────────
                .route("/vessels/live", get(vessels::live_vessels))
                // ── Zaštićeno: detalji i track zahtijevaju prijavu ─────────
                .route("/vessels/{mmsi}", get(vessels::get_vessel))
                .route("/vessels/{mmsi}/track", get(vessels::get_track))
                // ── Replay: premotavanje stanja flote unatrag ─────────────
                .route("/replay/snapshot", get(vessels::replay_snapshot))
                .route("/replay/range", get(vessels::replay_range))
                // ── AtoN pregled ──────────────────────────────────────────
                .route("/atons/live", get(atons::live_atons)),
        )
        // WS /ws — real-time stream (javno, gosti vide brodove)
        .route("/ws", get(ws::ws_handler))
}
