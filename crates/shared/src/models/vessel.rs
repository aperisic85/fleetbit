use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Pozicija broda — upisuje se svaki AIS signal
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct VesselPosition {
    pub time: DateTime<Utc>,
    pub mmsi: i32,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub sog: Option<f32>,      // speed over ground
    pub cog: Option<f32>,      // course over ground
    pub heading: Option<i16>,
    pub nav_status: Option<i16>,
    pub message_type: Option<i16>,
    pub station_id: Option<i16>,
}

/// Statički podaci o brodu — ime, tip, dimenzije
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Vessel {
    pub mmsi: i32,
    pub imo: Option<i32>,
    pub name: Option<String>,
    pub callsign: Option<String>,
    pub ship_type: Option<i16>,
    pub length: Option<i16>,
    pub width: Option<i16>,
    pub draught: Option<f32>,
    pub destination: Option<String>,
    pub last_seen: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Zadnja poznata pozicija broda — za live kartu
#[derive(Debug, Serialize, Deserialize)]
pub struct VesselLive {
    pub mmsi: i32,
    pub name: Option<String>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub sog: Option<f32>,
    pub cog: Option<f32>,
    pub heading: Option<i16>,
    pub nav_status: Option<i16>,
    pub last_seen: Option<DateTime<Utc>>,
}

/// Payload koji ingestor šalje kroz channel prema DB writeru
#[derive(Debug, Clone)]
pub struct PositionUpdate {
    pub mmsi: i32,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub sog: Option<f32>,
    pub cog: Option<f32>,
    pub heading: Option<i16>,
    pub nav_status: Option<i16>,
    pub message_type: i16,
    pub station_id: i16,
}

/// Payload za statičke podatke
#[derive(Debug, Clone)]
pub struct StaticUpdate {
    pub mmsi: i32,
    pub imo: Option<i32>,
    pub name: Option<String>,
    pub callsign: Option<String>,
    pub ship_type: Option<i16>,
    pub length: Option<i16>,
    pub width: Option<i16>,
    pub draught: Option<f32>,
    pub destination: Option<String>,
}
