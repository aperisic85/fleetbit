-- Backfill minimal vessel records for all MMSIs that have position data
-- but no entry in the vessels table. This fixes the empty general data
-- panel for vessels that only sent position messages (AIS type 1/2/3)
-- before the insert_position auto-create fix was deployed.
INSERT INTO vessels (mmsi, last_seen)
SELECT DISTINCT ON (vp.mmsi)
    vp.mmsi,
    MAX(vp.time) AS last_seen
FROM vessel_positions vp
WHERE NOT EXISTS (
    SELECT 1 FROM vessels v WHERE v.mmsi = vp.mmsi
)
GROUP BY vp.mmsi;
