use crate::models::health::{StationHealth, StationHealthUpdate};
use anyhow::Result;
use sqlx::PgPool;

pub async fn upsert_station_health(pool: &PgPool, h: &StationHealthUpdate) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO ais_station_health (
            station_id, name, addr, connected, last_message_at, last_health_at,
            received_lines, parsed_messages, position_messages, static_messages,
            aton_messages, meteo_messages, parse_yield_pct, last_error
        )
        VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (station_id) DO UPDATE SET
            name = EXCLUDED.name,
            addr = EXCLUDED.addr,
            connected = EXCLUDED.connected,
            last_message_at = COALESCE(EXCLUDED.last_message_at, ais_station_health.last_message_at),
            last_health_at = NOW(),
            received_lines = EXCLUDED.received_lines,
            parsed_messages = EXCLUDED.parsed_messages,
            position_messages = EXCLUDED.position_messages,
            static_messages = EXCLUDED.static_messages,
            aton_messages = EXCLUDED.aton_messages,
            meteo_messages = EXCLUDED.meteo_messages,
            parse_yield_pct = EXCLUDED.parse_yield_pct,
            last_error = EXCLUDED.last_error
        "#
    )
    .bind(h.station_id)
    .bind(&h.name)
    .bind(&h.addr)
    .bind(h.connected)
    .bind(h.last_message_at)
    .bind(h.received_lines)
    .bind(h.parsed_messages)
    .bind(h.position_messages)
    .bind(h.static_messages)
    .bind(h.aton_messages)
    .bind(h.meteo_messages)
    .bind(h.parse_yield_pct)
    .bind(&h.last_error)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_station_health(pool: &PgPool) -> Result<Vec<StationHealth>> {
    Ok(sqlx::query_as::<_, StationHealth>(
        r#"
        SELECT station_id, name, addr, connected, last_message_at, last_health_at,
               received_lines, parsed_messages, position_messages, static_messages,
               aton_messages, meteo_messages, parse_yield_pct, last_error
        FROM ais_station_health
        ORDER BY station_id
        "#
    )
    .fetch_all(pool)
    .await?)
}
