mod config;
mod station;
mod parser;

use anyhow::Result;
use dotenvy::dotenv;
use std::env;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::info;

use config::IngestorConfig;
use shared::db::pool::create_pool;
use shared::db::queries::atons::{upsert_aton, upsert_meteo};
use shared::db::queries::vessels::{insert_position, upsert_vessel_static};
use shared::models::aton::{AtonUpdate, MeteoUpdate};
use shared::models::vessel::{PositionUpdate, StaticUpdate};

#[tokio::main]
async fn main() -> Result<()> {
    // Logging
    tracing_subscriber::fmt()
        .with_env_filter("ingestor=debug,info")
        .init();

    dotenv().ok();

    // DB pool
    let database_url = env::var("DATABASE_URL")?;
    let pool = Arc::new(create_pool(&database_url).await?);

    info!("Connected to database");

    // Config sa stanicama — čita stations.toml ili fallback na defaults
    let config = IngestorConfig::load();

    // Channels — ingestor šalje, db writer prima
    let (pos_tx, mut pos_rx)       = mpsc::channel::<PositionUpdate>(10_000);
    let (static_tx, mut static_rx) = mpsc::channel::<StaticUpdate>(1_000);
    let (aton_tx, mut aton_rx)     = mpsc::channel::<AtonUpdate>(1_000);
    let (meteo_tx, mut meteo_rx)   = mpsc::channel::<MeteoUpdate>(1_000);

    // Spawn task za svaku stanicu
    for station in config.stations {
        let pos_tx    = pos_tx.clone();
        let static_tx = static_tx.clone();
        let aton_tx   = aton_tx.clone();
        let meteo_tx  = meteo_tx.clone();

        tokio::spawn(async move {
            station::run(station, pos_tx, static_tx, aton_tx, meteo_tx).await;
        });
    }

    // DB writer za pozicije
    let pool_pos = pool.clone();
    tokio::spawn(async move {
        while let Some(pos) = pos_rx.recv().await {
            if let Err(e) = insert_position(&pool_pos, &pos).await {
                tracing::error!("Failed to insert position: {}", e);
            }
        }
    });

    // DB writer za statičke podatke
    let pool_static = pool.clone();
    tokio::spawn(async move {
        while let Some(update) = static_rx.recv().await {
            if let Err(e) = upsert_vessel_static(&pool_static, &update).await {
                tracing::error!("Failed to upsert vessel static: {}", e);
            }
        }
    });

    // DB writer za AtoNe (tip 21)
    let pool_aton = pool.clone();
    tokio::spawn(async move {
        while let Some(update) = aton_rx.recv().await {
            if let Err(e) = upsert_aton(&pool_aton, &update).await {
                tracing::error!("Failed to upsert AtoN: {}", e);
            }
        }
    });

    // DB writer za meteorološke podatke (tip 8, DAC 001, FI 31)
    let pool_meteo = pool.clone();
    tokio::spawn(async move {
        while let Some(update) = meteo_rx.recv().await {
            if let Err(e) = upsert_meteo(&pool_meteo, &update).await {
                tracing::error!("Failed to upsert meteo: {}", e);
            }
        }
    });

    info!("Ingestor running...");

    // Drži main task živ
    tokio::signal::ctrl_c().await?;
    info!("Shutting down...");

    Ok(())
}
