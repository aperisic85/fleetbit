use shared::models::vessel::VesselPosition;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::broadcast;

use crate::auth::JwtSecret;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_secret: Arc<JwtSecret>,
    /// Broadcast kanal za slanje novih pozicija WebSocket klijentima.
    pub position_tx: broadcast::Sender<Arc<VesselPosition>>,
}

impl AppState {
    pub fn new(pool: PgPool, jwt_secret: String) -> Self {
        let (position_tx, _) = broadcast::channel(512);
        Self {
            pool,
            jwt_secret: Arc::new(JwtSecret(jwt_secret)),
            position_tx,
        }
    }
}
