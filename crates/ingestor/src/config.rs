use std::time::Duration;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct StationConfig {
    pub id: i16,
    pub name: String,
    pub addr: String,
}

#[derive(Debug)]
pub struct IngestorConfig {
    pub stations: Vec<StationConfig>,
    pub reconnect_delay: Duration,
    pub max_reconnect_attempts: u32,
    pub read_timeout: Duration,
}

#[derive(Deserialize)]
struct StationsFile {
    stations: Vec<StationConfig>,
}

impl IngestorConfig {
    /// Učitava popis stanica iz TOML filea.
    /// Path se čita iz env varijable STATIONS_CONFIG, default je "stations.toml".
    /// Ako file ne postoji, vraća hardkodirane default stanice.
    pub fn load() -> Self {
        let path = std::env::var("STATIONS_CONFIG")
            .unwrap_or_else(|_| "stations.toml".into());

        let stations = std::fs::read_to_string(&path)
            .ok()
            .and_then(|contents| toml::from_str::<StationsFile>(&contents).ok())
            .map(|f| f.stations)
            .unwrap_or_else(|| {
                tracing::warn!("stations config '{}' not found or invalid, using built-in defaults", path);
                Self::default_stations()
            });

        Self {
            stations,
            reconnect_delay: Duration::from_secs(5),
            max_reconnect_attempts: 10,
            read_timeout: Duration::from_secs(30),
        }
    }

    fn default_stations() -> Vec<StationConfig> {
        vec![
            StationConfig { id: 1, name: "Labinstica".into(), addr: "192.168.55.161:4712".into() },
            StationConfig { id: 2, name: "VDG".into(),        addr: "192.168.52.161:4712".into() },
            StationConfig { id: 3, name: "Ucka".into(),       addr: "192.168.61.161:4712".into() },
            StationConfig { id: 4, name: "Osor".into(),       addr: "192.168.66.161:4712".into() },
        ]
    }
}

impl Default for IngestorConfig {
    fn default() -> Self {
        Self {
            stations: Self::default_stations(),
            reconnect_delay: Duration::from_secs(5),
            max_reconnect_attempts: 10,
            read_timeout: Duration::from_secs(30),
        }
    }
}
