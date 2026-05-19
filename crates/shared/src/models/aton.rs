use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Aktivni AtoN — za live kartu (zadnje poznato stanje)
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct AtonLive {
    pub mmsi: i32,
    pub name: Option<String>,
    pub aid_type: Option<i16>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub off_position: bool,
    pub virtual_aid: bool,
    pub status_raw: Option<i16>,
    pub alarm: Option<bool>,
    pub light_status: Option<i16>,
    pub racon_status: Option<i16>,
    pub last_seen: Option<DateTime<Utc>>,
}

/// Payload koji ingestor šalje kroz channel prema DB writeru
#[derive(Debug, Clone)]
pub struct AtonUpdate {
    pub mmsi: i32,
    pub name: Option<String>,
    pub aid_type: Option<i16>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub off_position: bool,
    pub virtual_aid: bool,
    pub status_raw: i16,
    pub alarm: bool,
    pub light_status: i16,
    pub racon_status: i16,
    pub station_id: i16,
}
