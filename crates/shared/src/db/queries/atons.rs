use crate::models::aton::{AtonLive, AtonUpdate, MeteoUpdate};
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

pub async fn upsert_meteo(pool: &PgPool, m: &MeteoUpdate) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO atons
            (mmsi, off_position, virtual_aid,
             wind_speed, wind_gust, wind_dir, air_temp, humidity, dew_point,
             air_pressure, visibility, water_temp, wave_height, wave_period,
             wave_dir, precipitation, meteo_at)
        VALUES
            ($1, FALSE, FALSE,
             $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (mmsi) DO UPDATE SET
            wind_speed   = COALESCE(EXCLUDED.wind_speed,   atons.wind_speed),
            wind_gust    = COALESCE(EXCLUDED.wind_gust,    atons.wind_gust),
            wind_dir     = COALESCE(EXCLUDED.wind_dir,     atons.wind_dir),
            air_temp     = COALESCE(EXCLUDED.air_temp,     atons.air_temp),
            humidity     = COALESCE(EXCLUDED.humidity,     atons.humidity),
            dew_point    = COALESCE(EXCLUDED.dew_point,    atons.dew_point),
            air_pressure = COALESCE(EXCLUDED.air_pressure, atons.air_pressure),
            visibility   = COALESCE(EXCLUDED.visibility,   atons.visibility),
            water_temp   = COALESCE(EXCLUDED.water_temp,   atons.water_temp),
            wave_height  = COALESCE(EXCLUDED.wave_height,  atons.wave_height),
            wave_period  = COALESCE(EXCLUDED.wave_period,  atons.wave_period),
            wave_dir     = COALESCE(EXCLUDED.wave_dir,     atons.wave_dir),
            precipitation = COALESCE(EXCLUDED.precipitation, atons.precipitation),
            meteo_at     = NOW()
        "#,
    )
    .bind(m.mmsi)
    .bind(m.wind_speed)
    .bind(m.wind_gust)
    .bind(m.wind_dir)
    .bind(m.air_temp)
    .bind(m.humidity)
    .bind(m.dew_point)
    .bind(m.air_pressure)
    .bind(m.visibility)
    .bind(m.water_temp)
    .bind(m.wave_height)
    .bind(m.wave_period)
    .bind(m.wave_dir)
    .bind(m.precipitation)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_live_atons(pool: &PgPool) -> Result<Vec<AtonLive>> {
    let atons = sqlx::query_as::<_, AtonLive>(
        r#"
        SELECT mmsi, name, aid_type, lat, lon, off_position, virtual_aid,
               status_raw, alarm, light_status, racon_status, last_seen,
               wind_speed, wind_gust, wind_dir, air_temp, humidity, dew_point,
               air_pressure, visibility, water_temp, wave_height, wave_period,
               wave_dir, precipitation, meteo_at
        FROM atons
        ORDER BY mmsi
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(atons)
}
