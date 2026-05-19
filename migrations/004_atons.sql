-- AtoN (Aid to Navigation) tablica — AIS poruka tip 21
CREATE TABLE atons (
    mmsi            INTEGER         PRIMARY KEY,
    name            VARCHAR(20),
    aid_type        SMALLINT,       -- 1-31 (NavaidType)
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    off_position    BOOLEAN         NOT NULL DEFAULT FALSE,
    virtual_aid     BOOLEAN         NOT NULL DEFAULT FALSE,
    status_raw      SMALLINT,       -- regional_reserved (8 bita sirovo)
    alarm           BOOLEAN,        -- bit 0: opći alarm
    light_status    SMALLINT,       -- bitovi 1-3: status svjetla (0-7)
    racon_status    SMALLINT,       -- bitovi 4-5: status racona (0-3)
    station_id      SMALLINT,
    last_seen       TIMESTAMPTZ     DEFAULT NOW()
);
