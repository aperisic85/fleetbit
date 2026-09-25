use crate::config::StationConfig;
use crate::parser::{FleetbitParser, ParsedMessage};
use chrono::Utc;
use shared::models::aton::{AtonUpdate, MeteoUpdate};
use shared::models::health::StationHealthUpdate;
use shared::models::vessel::{PositionUpdate, StaticUpdate};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc::Sender;
use tokio::time::{sleep, timeout, Duration, Instant};
use tracing::{error, info, warn};

#[derive(Default)]
struct Counters {
    received_lines: i64,
    parsed_messages: i64,
    position_messages: i64,
    static_messages: i64,
    aton_messages: i64,
    meteo_messages: i64,
}

impl Counters {
    fn parse_yield_pct(&self) -> f64 {
        if self.received_lines == 0 {
            0.0
        } else {
            (self.parsed_messages as f64 / self.received_lines as f64) * 100.0
        }
    }
}

pub async fn run(
    config: StationConfig,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
    aton_tx: Sender<AtonUpdate>,
    meteo_tx: Sender<MeteoUpdate>,
    health_tx: Sender<StationHealthUpdate>,
    reconnect_delay: Duration,
    read_timeout: Duration,
) {
    let mut attempt = 0u32;

    loop {
        info!(
            station_id = config.id,
            station = %config.name,
            addr = %config.addr,
            "Connecting to AIS station"
        );

        match TcpStream::connect(&config.addr).await {
            Ok(stream) => {
                attempt = 0;
                info!(
                    station_id = config.id,
                    station = %config.name,
                    "Connected to AIS station"
                );

                let _ = health_tx.send(health_update(
                    &config,
                    true,
                    None,
                    &Counters::default(),
                    None,
                )).await;

                if let Err(e) = handle_stream(
                    stream,
                    &config,
                    pos_tx.clone(),
                    static_tx.clone(),
                    aton_tx.clone(),
                    meteo_tx.clone(),
                    health_tx.clone(),
                    read_timeout,
                )
                .await
                {
                    warn!(
                        station_id = config.id,
                        station = %config.name,
                        error = %e,
                        "AIS stream ended; reconnecting"
                    );

                    let _ = health_tx.send(health_update(
                        &config,
                        false,
                        None,
                        &Counters::default(),
                        Some(e.to_string()),
                    )).await;
                }

                sleep(reconnect_delay).await;
            }
            Err(e) => {
                attempt = attempt.saturating_add(1);
                error!(
                    station_id = config.id,
                    station = %config.name,
                    attempt,
                    error = %e,
                    "Failed to connect to AIS station"
                );

                let _ = health_tx.send(health_update(
                    &config,
                    false,
                    None,
                    &Counters::default(),
                    Some(e.to_string()),
                )).await;

                let base_secs = reconnect_delay.as_secs().max(1);
                let delay_secs = base_secs.saturating_mul(attempt as u64).min(60);
                sleep(Duration::from_secs(delay_secs)).await;
            }
        }
    }
}

async fn handle_stream(
    stream: TcpStream,
    config: &StationConfig,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
    aton_tx: Sender<AtonUpdate>,
    meteo_tx: Sender<MeteoUpdate>,
    health_tx: Sender<StationHealthUpdate>,
    read_timeout: Duration,
) -> anyhow::Result<()> {
    let reader = BufReader::new(stream);
    let mut lines = reader.lines();
    let mut parser = FleetbitParser::new();
    let mut counters = Counters::default();
    let mut last_stats = Instant::now();
    let mut last_message_at = None;

    loop {
        let line = match timeout(read_timeout, lines.next_line()).await {
            Ok(Ok(Some(line))) => line,
            Ok(Ok(None)) => anyhow::bail!("AIS stream closed by remote"),
            Ok(Err(e)) => return Err(e.into()),
            Err(_) => anyhow::bail!(
                "no AIS data received for {} seconds",
                read_timeout.as_secs()
            ),
        };

        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        counters.received_lines += 1;
        last_message_at = Some(Utc::now());

        match parser.parse_line(&line, config.id) {
            Some(ParsedMessage::Position(pos)) => {
                counters.parsed_messages += 1;
                counters.position_messages += 1;
                pos_tx.send(pos).await.map_err(|_| anyhow::anyhow!("position channel closed"))?;
            }
            Some(ParsedMessage::Static(update)) => {
                counters.parsed_messages += 1;
                counters.static_messages += 1;
                static_tx.send(update).await.map_err(|_| anyhow::anyhow!("static channel closed"))?;
            }
            Some(ParsedMessage::Aton(update)) => {
                counters.parsed_messages += 1;
                counters.aton_messages += 1;
                aton_tx.send(update).await.map_err(|_| anyhow::anyhow!("AtoN channel closed"))?;
            }
            Some(ParsedMessage::Meteo(update)) => {
                counters.parsed_messages += 1;
                counters.meteo_messages += 1;
                meteo_tx.send(update).await.map_err(|_| anyhow::anyhow!("meteo channel closed"))?;
            }
            None => {}
        }

        if last_stats.elapsed() >= Duration::from_secs(60) {
            let yield_pct = counters.parse_yield_pct();
            info!(
                station_id = config.id,
                station = %config.name,
                received_lines = counters.received_lines,
                parsed_messages = counters.parsed_messages,
                position_messages = counters.position_messages,
                static_messages = counters.static_messages,
                aton_messages = counters.aton_messages,
                meteo_messages = counters.meteo_messages,
                parse_yield_pct = yield_pct,
                "AIS station health"
            );

            let _ = health_tx.send(health_update(
                config,
                true,
                last_message_at,
                &counters,
                None,
            )).await;

            last_stats = Instant::now();
        }
    }
}

fn health_update(
    config: &StationConfig,
    connected: bool,
    last_message_at: Option<chrono::DateTime<Utc>>,
    counters: &Counters,
    last_error: Option<String>,
) -> StationHealthUpdate {
    StationHealthUpdate {
        station_id: config.id,
        name: config.name.clone(),
        addr: config.addr.clone(),
        connected,
        last_message_at,
        received_lines: counters.received_lines,
        parsed_messages: counters.parsed_messages,
        position_messages: counters.position_messages,
        static_messages: counters.static_messages,
        aton_messages: counters.aton_messages,
        meteo_messages: counters.meteo_messages,
        parse_yield_pct: counters.parse_yield_pct(),
        last_error,
    }
}
