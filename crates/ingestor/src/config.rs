use std::time::Duration;

#[derive(Debug, Clone)]
pub struct StationConfig {
    pub id: i16,
    pub name: String,
    pub addr: String,
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct IngestorConfig {
    pub stations: Vec<StationConfig>,
    pub reconnect_delay: Duration,
    pub max_reconnect_attempts: u32,
    pub read_timeout: Duration,
}
//nothing
impl Default for IngestorConfig {
    fn default() -> Self {
        Self {
            stations: vec![
                StationConfig { id: 1, name: "Labinstica".into(), addr: "192.168.55.161:4712".into() },
                StationConfig { id: 2, name: "VDG".into(),        addr: "192.168.52.161:4712".into() },
                StationConfig { id: 3, name: "Ucka".into(),       addr: "192.168.61.161:4712".into() },
                StationConfig { id: 4, name: "Osor".into(),       addr: "192.168.66.161:4712".into() },
            ],
            reconnect_delay: Duration::from_secs(5),
            max_reconnect_attempts: 10,
            read_timeout: Duration::from_secs(30),
        }
    }
}
