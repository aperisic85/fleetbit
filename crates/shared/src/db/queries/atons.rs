use crate::models::aton::{AtonLive, AtonUpdate};
use anyhow::Result;
use sqlx::PgPool;

pub async fn upsert_aton(pool: &PgPool, update: &AtonUpdate) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO atons
            (mmsi, name, aid_type, lat, lon, off_position, virtual_aid,
             status_raw, alarm, light_status, racon_status, station_id, last_seen)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (mmsi) DO UPDATE SET
            name         = COALESCE(EXCLUDED.name, atons.name),
            aid_type     = COALESCE(EXCLUDED.aid_type, atons.aid_type),
            lat          = COALESCE(EXCLUDED.lat, atons.lat),
            lon          = COALESCE(EXCLUDED.lon, atons.lon),
            off_position = EXCLUDED.off_position,
            virtual_aid  = EXCLUDED.virtual_aid,
            status_raw   = EXCLUDED.status_raw,
            alarm        = EXCLUDED.alarm,
            light_status = EXCLUDED.light_status,
            racon_status = EXCLUDED.racon_status,
            station_id   = EXCLUDED.station_id,
            last_seen    = NOW()
        "#,
    )
    .bind(update.mmsi)
    .bind(update.name.as_deref())
    .bind(update.aid_type)
    .bind(update.lat)
    .bind(update.lon)
    .bind(update.off_position)
    .bind(update.virtual_aid)
    .bind(update.status_raw)
    .bind(update.alarm)
    .bind(update.light_status)
    .bind(update.racon_status)
    .bind(update.station_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_live_atons(pool: &PgPool) -> Result<Vec<AtonLive>> {
    let atons = sqlx::query_as::<_, AtonLive>(
        r#"
        SELECT mmsi, name, aid_type, lat, lon, off_position, virtual_aid,
               status_raw, alarm, light_status, racon_status, last_seen
        FROM atons
        ORDER BY mmsi
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(atons)
}
