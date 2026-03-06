use shared::models::vessel::VesselPosition;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    /// Broadcast kanal za slanje novih pozicija WebSocket klijentima.
    pub position_tx: broadcast::Sender<Arc<VesselPosition>>,
}

impl AppState {
    pub fn new(pool: PgPool) -> Self {
        let (position_tx, _) = broadcast::channel(512);
        Self { pool, position_tx }
    }
}
