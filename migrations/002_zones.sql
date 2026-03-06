-- Zone za geofencing
CREATE TABLE zones (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    geom        GEOMETRY(Polygon, 4326) NOT NULL,
    alert_on    VARCHAR(10)     DEFAULT 'both', -- 'enter', 'exit', 'both'
    active      BOOLEAN         DEFAULT true,
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX ON zones USING GIST (geom);

-- Fleet (charter kompanije grupiraju brodove)
CREATE TABLE fleets (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);

-- Brodovi u fleetu
CREATE TABLE fleet_vessels (
    fleet_id    UUID            NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    mmsi        INTEGER         NOT NULL REFERENCES vessels(mmsi),
    alias       VARCHAR(50),    -- prilagođeno ime u fleetu
    added_at    TIMESTAMPTZ     DEFAULT NOW(),
    PRIMARY KEY (fleet_id, mmsi)
);
