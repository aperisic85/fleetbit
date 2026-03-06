use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Fleet {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct FleetVessel {
    pub fleet_id: Uuid,
    pub mmsi: i32,
    pub alias: Option<String>,
    pub added_at: Option<DateTime<Utc>>,
}
