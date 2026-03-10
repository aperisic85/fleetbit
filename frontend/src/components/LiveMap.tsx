import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { VesselLive, TrackPoint } from '../types';
import { VesselMarker } from './VesselMarker';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  track: TrackPoint[];
  onSelect: (mmsi: number) => void;
}

export function LiveMap({ vessels, selectedMmsi, track, onSelect }: Props) {
  const trackPositions = track
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => [p.lat!, p.lon!] as [number, number]);

  return (
    <MapContainer
      center={[45.0, 14.5]}
      zoom={7}
      style={{ flex: 1, height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trackPositions.length > 1 && (
        <Polyline positions={trackPositions} color="#f59e0b" weight={2} opacity={0.7} />
      )}
      {vessels.map((v) => (
        <VesselMarker
          key={v.mmsi}
          vessel={v}
          selected={v.mmsi === selectedMmsi}
          onClick={() => onSelect(v.mmsi)}
        />
      ))}
    </MapContainer>
  );
}
