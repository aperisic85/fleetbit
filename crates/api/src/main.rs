use anyhow::Result;
use shared::{db::queries::vessels as db, models::vessel::VesselPosition};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

mod auth;
mod error;
mod routes;
mod state;

use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("api=debug".parse()?)
                .add_directive("tower_http=info".parse()?),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL nije postavljen");
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        tracing::warn!("JWT_SECRET nije postavljen — koristi se privremeni random ključ!");
        use rand::Rng;
        let secret: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();
        secret
    });

    let pool = shared::db::pool::create_pool(&database_url).await?;
    tracing::info!("Spojen na bazu podataka");

    let app_state = AppState::new(pool.clone(), jwt_secret);

    // Pozadinski task: prati nove pozicije i šalje ih WS klijentima
    tokio::spawn(run_position_broadcaster(
        pool,
        app_state.position_tx.clone(),
    ));

    let app = routes::router()
        .layer(axum::Extension(app_state.jwt_secret.clone()))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!("API sluša na {bind_addr}");

    axum::serve(listener, app).await?;
    Ok(())
}

/// Svakih 2 sekunde provjerava postoje li nove pozicije i broadcastuje ih.
async fn run_position_broadcaster(
    pool: sqlx::PgPool,
    tx: broadcast::Sender<Arc<VesselPosition>>,
) {
    let mut last_time = chrono::Utc::now() - chrono::Duration::seconds(10);
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));

    loop {
        interval.tick().await;

        if tx.receiver_count() == 0 {
            continue; // nema spojenih klijenata, preskači upit
        }

        match db::get_positions_since(&pool, last_time).await {
            Ok(positions) => {
                if let Some(latest) = positions.last() {
                    last_time = latest.time;
                }
                for pos in positions {
                    if tx.send(Arc::new(pos)).is_err() {
                        break; // svi receiveri su droppani
                    }
                }
            }
            Err(e) => tracing::error!("Broadcaster upit failed: {e:#}"),
        }
    }
}
