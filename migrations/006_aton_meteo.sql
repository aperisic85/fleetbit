-- AIS Message Type 8, DAC 001, FI 31 — Meteorological and Hydrological data
ALTER TABLE atons
    ADD COLUMN IF NOT EXISTS wind_speed     REAL,       -- knots (average)
    ADD COLUMN IF NOT EXISTS wind_gust      REAL,       -- knots (gust)
    ADD COLUMN IF NOT EXISTS wind_dir       SMALLINT,   -- degrees (0-359)
    ADD COLUMN IF NOT EXISTS air_temp       REAL,       -- °C
    ADD COLUMN IF NOT EXISTS humidity       SMALLINT,   -- %
    ADD COLUMN IF NOT EXISTS dew_point      REAL,       -- °C
    ADD COLUMN IF NOT EXISTS air_pressure   SMALLINT,   -- hPa
    ADD COLUMN IF NOT EXISTS visibility     REAL,       -- nm
    ADD COLUMN IF NOT EXISTS water_temp     REAL,       -- °C
    ADD COLUMN IF NOT EXISTS wave_height    REAL,       -- m
    ADD COLUMN IF NOT EXISTS wave_period    SMALLINT,   -- seconds
    ADD COLUMN IF NOT EXISTS wave_dir       SMALLINT,   -- degrees (0-359)
    ADD COLUMN IF NOT EXISTS precipitation  SMALLINT,   -- 0=n/a,1=kiša,2=grmljavina,3=ledena kiša,4=mješano,5=snijeg
    ADD COLUMN IF NOT EXISTS meteo_at       TIMESTAMPTZ;
