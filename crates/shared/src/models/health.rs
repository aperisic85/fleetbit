use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone)]
pub struct StationHealthUpdate {
    pub station_id: i16,
    pub name: String,
    pub addr: String,
    pub connected: bool,
    pub last_message_at: Option<DateTime<Utc>>,
    pub received_lines: i64,
    pub parsed_messages: i64,
    pub position_messages: i64,
    pub static_messages: i64,
    pub aton_messages: i64,
    pub meteo_messages: i64,
    pub parse_yield_pct: f64,
    pub last_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StationHealth {
    pub station_id: i16,
    pub name: String,
    pub addr: String,
    pub connected: bool,
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_health_at: DateTime<Utc>,
    pub received_lines: i64,
    pub parsed_messages: i64,
    pub position_messages: i64,
    pub static_messages: i64,
    pub aton_messages: i64,
    pub meteo_messages: i64,
    pub parse_yield_pct: f64,
    pub last_error: Option<String>,
}
