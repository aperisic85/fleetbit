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
    // AIS Type 8, DAC 001, FI 31 — meteorološki podaci
    pub wind_speed: Option<f32>,
    pub wind_gust: Option<f32>,
    pub wind_dir: Option<i16>,
    pub air_temp: Option<f32>,
    pub humidity: Option<i16>,
    pub dew_point: Option<f32>,
    pub air_pressure: Option<i16>,
    pub visibility: Option<f32>,
    pub water_temp: Option<f32>,
    pub wave_height: Option<f32>,
    pub wave_period: Option<i16>,
    pub wave_dir: Option<i16>,
    pub precipitation: Option<i16>,
    pub meteo_at: Option<DateTime<Utc>>,
}

/// Payload koji ingestor šalje kroz channel prema DB writeru (AIS tip 21)
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

/// Payload iz AIS tip 8, DAC 001, FI 31 — meteorološki i hidrološki podaci
#[derive(Debug, Clone)]
pub struct MeteoUpdate {
    pub mmsi: i32,
    pub wind_speed: Option<f32>,
    pub wind_gust: Option<f32>,
    pub wind_dir: Option<i16>,
    pub air_temp: Option<f32>,
    pub humidity: Option<i16>,
    pub dew_point: Option<f32>,
    pub air_pressure: Option<i16>,
    pub visibility: Option<f32>,
    pub water_temp: Option<f32>,
    pub wave_height: Option<f32>,
    pub wave_period: Option<i16>,
    pub wave_dir: Option<i16>,
    pub precipitation: Option<i16>,
}
