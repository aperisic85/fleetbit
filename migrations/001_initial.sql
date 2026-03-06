-- Omogući TimescaleDB i PostGIS ekstenzije
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Pozicije brodova (time-series)
CREATE TABLE vessel_positions (
    time            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    mmsi            INTEGER         NOT NULL,
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    sog             REAL,           -- speed over ground (čvorovi)
    cog             REAL,           -- course over ground (stupnjevi)
    heading         SMALLINT,       -- pravi kurs
    nav_status      SMALLINT,       -- navigacijski status
    message_type    SMALLINT,       -- AIS tip poruke (1,2,3,18...)
    station_id      SMALLINT        -- koja bazna stanica
);

-- TimescaleDB hypertable
SELECT create_hypertable('vessel_positions', 'time');

-- Indeksi
CREATE INDEX ON vessel_positions (mmsi, time DESC);

-- Statički podaci o brodu
CREATE TABLE vessels (
    mmsi            INTEGER         PRIMARY KEY,
    imo             INTEGER,
    name            VARCHAR(20),
    callsign        VARCHAR(7),
    ship_type       SMALLINT,
    length          SMALLINT,
    width           SMALLINT,
    draught         REAL,
    destination     VARCHAR(20),
    last_seen       TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);
