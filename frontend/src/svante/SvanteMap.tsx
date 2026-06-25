import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackPoint, VesselLive } from '../types';
import { CameraOverlay } from '../components/CameraOverlay';
import { CHANNEL_CENTER, CHANNEL_ZOOM } from './channel';
import { ChannelOverlay } from './ChannelOverlay';
import { CollisionLayer } from './CollisionLayer';
import { SvanteVesselMarker } from './SvanteVesselMarker';
import type { ChannelWatch } from './useChannelWatch';
import type { Encounter } from './collision';

const MAP_CENTER: [number, number] = [
  parseFloat(import.meta.env.VITE_MAP_CENTER_LAT ?? String(CHANNEL_CENTER[0])),
  parseFloat(import.meta.env.VITE_MAP_CENTER_LON ?? String(CHANNEL_CENTER[1])),
];
const MAP_ZOOM = parseInt(import.meta.env.VITE_MAP_CENTER_ZOOM ?? String(CHANNEL_ZOOM), 10);

interface Props {
  vessels: VesselLive[];
  watch: ChannelWatch;
  encounters: Encounter[];
  selectedMmsi: number | null;
  track: TrackPoint[];
  onSelect: (mmsi: number) => void;
  resetKey: number;
}

function MapController({ vessels, selectedMmsi, resetKey }: { vessels: VesselLive[]; selectedMmsi: number | null; resetKey: number }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMmsi == null) return;
    const vessel = vessels.find((v) => v.mmsi === selectedMmsi);
    if (vessel?.lat != null && vessel?.lon != null) {
      map.flyTo([vessel.lat, vessel.lon], Math.max(map.getZoom(), 14), { duration: 1.0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMmsi]);

  useEffect(() => {
    if (resetKey === 0) return;
    map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 1.0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return null;
}

/** Karta fokusirana na Kanal sv. Ante s označenom nadzornom zonom */
export function SvanteMap({ vessels, watch, encounters, selectedMmsi, track, onSelect, resetKey }: Props) {
  const channelByMmsi = new Map(watch.channelVessels.map((c) => [c.vessel.mmsi, c]));

  const trackPositions = track
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => [p.lat!, p.lon!] as [number, number]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <MapController vessels={vessels} selectedMmsi={selectedMmsi} resetKey={resetKey} />

        <ChannelOverlay level={watch.level} />

        <CollisionLayer encounters={encounters} />

        {trackPositions.length >= 2 && (
          <Polyline positions={trackPositions} color="#f59e0b" weight={2} opacity={0.75} />
        )}

        {vessels.map((v) => (
          <SvanteVesselMarker
            key={v.mmsi}
            vessel={v}
            channelInfo={channelByMmsi.get(v.mmsi) ?? null}
            selected={v.mmsi === selectedMmsi}
            onClick={() => onSelect(v.mmsi)}
          />
        ))}
      </MapContainer>

      <CameraOverlay />
    </div>
  );
}
