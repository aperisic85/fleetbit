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

    // Ensure a minimal vessel record exists so the detail panel can load
    sqlx::query(
        "INSERT INTO vessels (mmsi, last_seen) VALUES ($1, NOW()) ON CONFLICT (mmsi) DO NOTHING"
    )
    .bind(pos.mmsi)
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
    let vessels = sqlx::query_as::<_, VesselLive>(
        r#"
        SELECT
            vl.mmsi       AS mmsi,
            v.name        AS name,
            v.ship_type   AS ship_type,
            vl.lat        AS lat,
            vl.lon        AS lon,
            vl.sog        AS sog,
            vl.cog        AS cog,
            vl.heading    AS heading,
            vl.nav_status AS nav_status,
            vl.last_seen  AS last_seen
        FROM vessel_latest vl
        LEFT JOIN vessels v ON v.mmsi = vl.mmsi
        WHERE vl.last_seen > NOW() - INTERVAL '2 hours'
        "#,
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

/// Snapshot cijele flote u trenutku `at` — za svaki MMSI zadnja poznata
/// pozicija na ili prije `at`, ali samo ako nije starija od `window_minutes`
/// (inače brod nije bio "prisutan" u tom trenutku). Koristi se za premotavanje
/// karte unatrag na točno određeno vrijeme.
pub async fn get_vessels_at(
    pool: &PgPool,
    at: DateTime<Utc>,
    window_minutes: i64,
) -> Result<Vec<VesselLive>> {
    let vessels = sqlx::query_as::<_, VesselLive>(
        r#"
        SELECT DISTINCT ON (vp.mmsi)
            vp.mmsi       AS mmsi,
            v.name        AS name,
            v.ship_type   AS ship_type,
            vp.lat        AS lat,
            vp.lon        AS lon,
            vp.sog        AS sog,
            vp.cog        AS cog,
            vp.heading    AS heading,
            vp.nav_status AS nav_status,
            vp.time       AS last_seen
        FROM vessel_positions vp
        LEFT JOIN vessels v ON v.mmsi = vp.mmsi
        WHERE vp.time <= $1
          AND vp.time >= $1 - make_interval(mins => $2)
          AND vp.lat IS NOT NULL
          AND vp.lon IS NOT NULL
        ORDER BY vp.mmsi, vp.time DESC
        "#,
    )
    .bind(at)
    .bind(window_minutes as i32)
    .fetch_all(pool)
    .await?;
    Ok(vessels)
}

/// Sve pozicije svih brodova u rasponu [from, to] — sirovi podaci za
/// animirani replay na klijentu. Sortirano po vremenu uzlazno.
pub async fn get_fleet_positions(
    pool: &PgPool,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
    limit: i64,
) -> Result<Vec<VesselPosition>> {
    let positions = sqlx::query_as::<_, VesselPosition>(
        r#"
        SELECT time, mmsi, lat, lon, sog, cog, heading, nav_status, message_type, station_id
        FROM vessel_positions
        WHERE time >= $1
          AND time <= $2
          AND lat IS NOT NULL
          AND lon IS NOT NULL
        ORDER BY time ASC
        LIMIT $3
        "#,
    )
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
