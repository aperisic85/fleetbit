use crate::models::vessel::{PositionUpdate, StaticUpdate, Vessel, VesselLive, VesselPosition};
use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

pub async fn insert_position(pool: &PgPool, pos: &PositionUpdate) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO vessel_positions
            (mmsi, lat, lon, sog, cog, heading, nav_status, message_type, station_id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        pos.mmsi,
        pos.lat,
        pos.lon,
        pos.sog,
        pos.cog,
        pos.heading,
        pos.nav_status,
        pos.message_type,
        pos.station_id,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_vessel_static(pool: &PgPool, update: &StaticUpdate) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO vessels (mmsi, imo, name, callsign, ship_type, length, width, draught, destination, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (mmsi) DO UPDATE SET
            imo         = COALESCE(EXCLUDED.imo, vessels.imo),
            name        = COALESCE(EXCLUDED.name, vessels.name),
            callsign    = COALESCE(EXCLUDED.callsign, vessels.callsign),
            ship_type   = COALESCE(EXCLUDED.ship_type, vessels.ship_type),
            length      = COALESCE(EXCLUDED.length, vessels.length),
            width       = COALESCE(EXCLUDED.width, vessels.width),
            draught     = COALESCE(EXCLUDED.draught, vessels.draught),
            destination = COALESCE(EXCLUDED.destination, vessels.destination),
            last_seen   = NOW(),
            updated_at  = NOW()
        "#,
        update.mmsi,
        update.imo,
        update.name,
        update.callsign,
        update.ship_type,
        update.length,
        update.width,
        update.draught,
        update.destination,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_live_vessels(pool: &PgPool) -> Result<Vec<VesselLive>> {
    let vessels = sqlx::query_as!(
        VesselLive,
        r#"
        SELECT DISTINCT ON (vp.mmsi)
            vp.mmsi,
            v.name,
            vp.lat,
            vp.lon,
            vp.sog,
            vp.cog,
            vp.heading,
            vp.nav_status,
            vp.time as last_seen
        FROM vessel_positions vp
        LEFT JOIN vessels v ON v.mmsi = vp.mmsi
        ORDER BY vp.mmsi, vp.time DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(vessels)
}

/// Dohvati statičke podatke jednog broda.
pub async fn get_vessel(pool: &PgPool, mmsi: i32) -> Result<Option<Vessel>> {
    let vessel = sqlx::query_as::<_, Vessel>(
        r#"
        SELECT mmsi, imo, name, callsign, ship_type, length, width, draught,
               destination, last_seen, updated_at
        FROM vessels
        WHERE mmsi = $1
        "#,
    )
    .bind(mmsi)
    .fetch_optional(pool)
    .await?;
    Ok(vessel)
}

/// Dohvati historijski trag broda u zadanom vremenskom rasponu.
pub async fn get_vessel_track(
    pool: &PgPool,
    mmsi: i32,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
    limit: i64,
) -> Result<Vec<VesselPosition>> {
    let positions = sqlx::query_as::<_, VesselPosition>(
        r#"
        SELECT time, mmsi, lat, lon, sog, cog, heading, nav_status, message_type, station_id
        FROM vessel_positions
        WHERE mmsi = $1
          AND time >= $2
          AND time <= $3
        ORDER BY time ASC
        LIMIT $4
        "#,
    )
    .bind(mmsi)
    .bind(from)
    .bind(to)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(positions)
}

/// Dohvati sve pozicije novije od `since` — koristi broadcaster za WebSocket.
pub async fn get_positions_since(
    pool: &PgPool,
    since: DateTime<Utc>,
) -> Result<Vec<VesselPosition>> {
    let positions = sqlx::query_as::<_, VesselPosition>(
        r#"
        SELECT time, mmsi, lat, lon, sog, cog, heading, nav_status, message_type, station_id
        FROM vessel_positions
        WHERE time > $1
        ORDER BY time ASC
        LIMIT 500
        "#,
    )
    .bind(since)
    .fetch_all(pool)
    .await?;
    Ok(positions)
}
