use crate::config::StationConfig;
use crate::parser::{FleetbitParser, ParsedMessage};
use shared::models::vessel::{PositionUpdate, StaticUpdate};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc::Sender;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

pub async fn run(
    config: StationConfig,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
) {
    let mut attempt = 0u32;

    loop {
        info!("Connecting to {} ({})", config.name, config.addr);

        match TcpStream::connect(&config.addr).await {
            Ok(stream) => {
                attempt = 0;
                info!("Connected to {}", config.name);

                if let Err(e) = handle_stream(
                    stream,
                    config.id,
                    &config.name,
                    pos_tx.clone(),
                    static_tx.clone(),
                )
                .await
                {
                    warn!("Stream error on {}: {}", config.name, e);
                }
            }
            Err(e) => {
                attempt += 1;
                error!(
                    "Failed to connect to {} (attempt {}): {}",
                    config.name, attempt, e
                );

                // Exponential backoff — max 60 sekundi
                let delay = Duration::from_secs((5 * attempt).min(60) as u64);
                sleep(delay).await;
            }
        }
    }
}

async fn handle_stream(
    stream: TcpStream,
    station_id: i16,
    _station_name: &str,
    pos_tx: Sender<PositionUpdate>,
    static_tx: Sender<StaticUpdate>,
) -> anyhow::Result<()> {
    let reader = BufReader::new(stream);
    let mut lines = reader.lines();
    let mut parser = FleetbitParser::new();

    while let Some(line) = lines.next_line().await? {
        let line = line.trim().to_string();

        if line.is_empty() {
            continue;
        }

        match parser.parse_line(&line, station_id) {
            Some(ParsedMessage::Position(pos)) => {
                if pos_tx.send(pos).await.is_err() {
                    break; // Receiver dropan, izlazi
                }
            }
            Some(ParsedMessage::Static(update)) => {
                if static_tx.send(update).await.is_err() {
                    break;
                }
            }
            None => {} // Fragment ili nepoznata poruka
        }
    }

    Ok(())
}
