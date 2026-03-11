import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { VesselLive, TrackPoint } from '../types';
import { VesselMarker } from './VesselMarker';
import { ClusterMarker } from './ClusterMarker';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  track: TrackPoint[];
  onSelect: (mmsi: number) => void;
}

const CLUSTER_THRESHOLD = 10; // zoom < 10 → klasteriranje

function gridSize(zoom: number): number {
  if (zoom < 5)  return 8;
  if (zoom < 7)  return 4;
  if (zoom < 9)  return 1.5;
  return 0.5;
}

interface Cluster {
  key: string;
  lat: number;
  lon: number;
  vessels: VesselLive[];
}

function buildClusters(vessels: VesselLive[], zoom: number, selectedMmsi: number | null) {
  if (zoom >= CLUSTER_THRESHOLD) {
    return { individual: vessels, clusters: [] as Cluster[] };
  }

  const gs = gridSize(zoom);
  const cells = new Map<string, VesselLive[]>();

  for (const v of vessels) {
    if (v.lat == null || v.lon == null) continue;
    // Odabrani brod uvijek ostaje individualan
    if (v.mmsi === selectedMmsi) continue;
    const cellLat = Math.round(v.lat / gs) * gs;
    const cellLon = Math.round(v.lon / gs) * gs;
    const key = `${cellLat.toFixed(4)},${cellLon.toFixed(4)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(v);
  }

  const individual: VesselLive[] = [];
  const clusters: Cluster[] = [];

  for (const [key, vs] of cells) {
    if (vs.length === 1) {
      individual.push(vs[0]);
    } else {
      const lat = vs.reduce((s, v) => s + v.lat!, 0) / vs.length;
      const lon = vs.reduce((s, v) => s + v.lon!, 0) / vs.length;
      clusters.push({ key, lat, lon, vessels: vs });
    }
  }

  // Uvijek prikaži odabrani brod individualno
  if (selectedMmsi != null) {
    const sel = vessels.find((v) => v.mmsi === selectedMmsi);
    if (sel) individual.push(sel);
  }

  return { individual, clusters };
}

// --- Child komponente (moraju biti unutar MapContainer konteksta) ---

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

function MapContent({
  vessels,
  selectedMmsi,
  track,
  onSelect,
}: Props) {
  const [zoom, setZoom] = useState(7);
  const map = useMap();

  useMapEvents({
    zoom: (e) => setZoom(e.target.getZoom()),
  });

  const { individual, clusters } = useMemo(
    () => buildClusters(vessels, zoom, selectedMmsi),
    [vessels, zoom, selectedMmsi]
  );

  const trackPositions = useMemo(
    () => track
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => [p.lat!, p.lon!] as [number, number]),
    [track]
  );

  return (
    <>
      {trackPositions.length > 1 && (
        <Polyline positions={trackPositions} color="#f59e0b" weight={2} opacity={0.7} />
      )}
      {clusters.map((c) => (
        <ClusterMarker
          key={c.key}
          lat={c.lat}
          lon={c.lon}
          count={c.vessels.length}
          onClick={() => map.flyTo([c.lat, c.lon], zoom + 3, { duration: 0.8 })}
        />
      ))}
      {individual.map((v) => (
        <VesselMarker
          key={v.mmsi}
          vessel={v}
          selected={v.mmsi === selectedMmsi}
          onClick={() => onSelect(v.mmsi)}
        />
      ))}
    </>
  );
}

export function LiveMap({ vessels, selectedMmsi, track, onSelect }: Props) {
  return (
    <MapContainer
      center={[45.0, 14.5]}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <MapController vessels={vessels} selectedMmsi={selectedMmsi} />
      <MapContent
        vessels={vessels}
        selectedMmsi={selectedMmsi}
        track={track}
        onSelect={onSelect}
      />
    </MapContainer>
  );
}
