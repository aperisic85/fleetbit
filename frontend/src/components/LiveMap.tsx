import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { VesselLive, TrackPoint } from '../types';
import { VesselMarker } from './VesselMarker';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  track: TrackPoint[];
  onSelect: (mmsi: number) => void;
}

function MapController({ vessels, selectedMmsi }: { vessels: VesselLive[]; selectedMmsi: number | null }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    if (selectedMmsi == null) return;
    const vessel = vessels.find((v) => v.mmsi === selectedMmsi);
    if (vessel?.lat != null && vessel?.lon != null) {
      const zoom = Math.max(map.getZoom(), 12);
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Panel zauzima ~55vh dna — pomakni centar prema dolje da brod bude u vidljivom gornjem dijelu
        const targetPoint = map.project([vessel.lat, vessel.lon], zoom);
        const offset = map.getSize().y * 0.27;
        const adjustedCenter = map.unproject(targetPoint.add([0, offset]), zoom);
        map.flyTo(adjustedCenter, zoom, { duration: 1.2 });
      } else {
        map.flyTo([vessel.lat, vessel.lon], zoom, { duration: 1.2 });
      }
    }
  }, [selectedMmsi]);

  return null;
}

export function LiveMap({ vessels, selectedMmsi, track, onSelect }: Props) {
  const trackPositions = track
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => [p.lat!, p.lon!] as [number, number]);

  return (
    <MapContainer
      center={[45.0, 14.5]}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController vessels={vessels} selectedMmsi={selectedMmsi} />
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
