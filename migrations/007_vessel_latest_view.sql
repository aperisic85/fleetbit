-- Materijalizirana tablica zadnjih pozicija brodova
-- Ažurira se triggerom pri svakom insertu u vessel_positions

CREATE TABLE vessel_latest (
    mmsi        INTEGER     PRIMARY KEY,
    lat         DOUBLE PRECISION,
    lon         DOUBLE PRECISION,
    sog         REAL,
    cog         REAL,
    heading     SMALLINT,
    nav_status  SMALLINT,
    last_seen   TIMESTAMPTZ NOT NULL
);

-- Popuni inicijalnim podacima
INSERT INTO vessel_latest (mmsi, lat, lon, sog, cog, heading, nav_status, last_seen)
SELECT DISTINCT ON (mmsi)
    mmsi, lat, lon, sog, cog, heading, nav_status, time
FROM vessel_positions
WHERE time > NOW() - INTERVAL '24 hours'
ORDER BY mmsi, time DESC;

-- Trigger funkcija
CREATE OR REPLACE FUNCTION upsert_vessel_latest()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO vessel_latest (mmsi, lat, lon, sog, cog, heading, nav_status, last_seen)
    VALUES (NEW.mmsi, NEW.lat, NEW.lon, NEW.sog, NEW.cog, NEW.heading, NEW.nav_status, NEW.time)
    ON CONFLICT (mmsi) DO UPDATE SET
        lat        = EXCLUDED.lat,
        lon        = EXCLUDED.lon,
        sog        = EXCLUDED.sog,
        cog        = EXCLUDED.cog,
        heading    = EXCLUDED.heading,
        nav_status = EXCLUDED.nav_status,
        last_seen  = EXCLUDED.last_seen
    WHERE EXCLUDED.last_seen > vessel_latest.last_seen;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vessel_latest
AFTER INSERT ON vessel_positions
FOR EACH ROW EXECUTE FUNCTION upsert_vessel_latest();
