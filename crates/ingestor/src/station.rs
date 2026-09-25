use crate::config::StationConfig;
use crate::parser::{FleetbitParser, ParsedMessage};
use shared::models::aton::{AtonUpdate, MeteoUpdate};
use shared::models::vessel::{PositionUpdate, StaticUpdate};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc::Sender;
use tokio::time::{sleep, timeout, Duration, Instant};
use tracing::{error, info, warn};

pub async fn run(
    config: StationConfig,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
    aton_tx: Sender<AtonUpdate>,
    meteo_tx: Sender<MeteoUpdate>,
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

                if let Err(e) = handle_stream(
                    stream,
                    config.id,
                    &config.name,
                    pos_tx.clone(),
                    static_tx.clone(),
                    aton_tx.clone(),
                    meteo_tx.clone(),
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
                }

                // I uspješno otvoren TCP stream može odmah puknuti ili ostati tih.
                // Kratka odgoda sprječava tight reconnect loop.
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

                // Linearni backoff od baznog reconnect_delay, max 60 sekundi.
                let base_secs = reconnect_delay.as_secs().max(1);
                let delay_secs = base_secs
                    .saturating_mul(attempt as u64)
                    .min(60);
                sleep(Duration::from_secs(delay_secs)).await;
            }
        }
    }
}

async fn handle_stream(
    stream: TcpStream,
    station_id: i16,
    station_name: &str,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
    aton_tx: Sender<AtonUpdate>,
    meteo_tx: Sender<MeteoUpdate>,
    read_timeout: Duration,
) -> anyhow::Result<()> {
    let reader = BufReader::new(stream);
    let mut lines = reader.lines();
    let mut parser = FleetbitParser::new();

    let mut received_lines: u64 = 0;
    let mut parsed_messages: u64 = 0;
    let mut position_messages: u64 = 0;
    let mut static_messages: u64 = 0;
    let mut aton_messages: u64 = 0;
    let mut meteo_messages: u64 = 0;
    let mut last_stats = Instant::now();

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

        received_lines += 1;

        match parser.parse_line(&line, station_id) {
            Some(ParsedMessage::Position(pos)) => {
                parsed_messages += 1;
                position_messages += 1;
                pos_tx
                    .send(pos)
                    .await
                    .map_err(|_| anyhow::anyhow!("position channel closed"))?;
            }
            Some(ParsedMessage::Static(update)) => {
                parsed_messages += 1;
                static_messages += 1;
                static_tx
                    .send(update)
                    .await
                    .map_err(|_| anyhow::anyhow!("static channel closed"))?;
            }
            Some(ParsedMessage::Aton(update)) => {
                parsed_messages += 1;
                aton_messages += 1;
                aton_tx
                    .send(update)
                    .await
                    .map_err(|_| anyhow::anyhow!("AtoN channel closed"))?;
            }
            Some(ParsedMessage::Meteo(update)) => {
                parsed_messages += 1;
                meteo_messages += 1;
                meteo_tx
                    .send(update)
                    .await
                    .map_err(|_| anyhow::anyhow!("meteo channel closed"))?;
            }
            None => {}
        }

        if last_stats.elapsed() >= Duration::from_secs(60) {
            info!(
                station_id,
                station = %station_name,
                received_lines,
                parsed_messages,
                position_messages,
                static_messages,
                aton_messages,
                meteo_messages,
                parse_yield_pct = if received_lines > 0 {
                    (parsed_messages as f64 / received_lines as f64) * 100.0
                } else {
                    0.0
                },
                "AIS station health"
            );
            last_stats = Instant::now();
        }
    }
}
