CREATE TABLE ais_station_health (
    station_id          SMALLINT PRIMARY KEY,
    name                TEXT NOT NULL,
    addr                TEXT NOT NULL,
    connected           BOOLEAN NOT NULL DEFAULT FALSE,
    last_message_at     TIMESTAMPTZ,
    last_health_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_lines      BIGINT NOT NULL DEFAULT 0,
    parsed_messages     BIGINT NOT NULL DEFAULT 0,
    position_messages   BIGINT NOT NULL DEFAULT 0,
    static_messages     BIGINT NOT NULL DEFAULT 0,
    aton_messages       BIGINT NOT NULL DEFAULT 0,
    meteo_messages      BIGINT NOT NULL DEFAULT 0,
    parse_yield_pct     DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_error          TEXT
);

CREATE INDEX idx_ais_station_health_last_health
    ON ais_station_health (last_health_at DESC);
