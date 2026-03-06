use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Zone {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub alert_on: Option<String>,
    pub active: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
}
