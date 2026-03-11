import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VesselLive, TrackPoint } from '../types';
import { VesselMarker } from './VesselMarker';
import { ClusterMarker } from './ClusterMarker';
import { HeatmapLayer } from './HeatmapLayer';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  track: TrackPoint[];
  onSelect: (mmsi: number) => void;
}

const CLUSTER_THRESHOLD = 10;

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

  if (selectedMmsi != null) {
    const sel = vessels.find((v) => v.mmsi === selectedMmsi);
    if (sel) individual.push(sel);
  }

  return { individual, clusters };
}

// Animated Polyline — crta se dash-offset animacijom kad track promijeni
function AnimatedTrack({ positions }: { positions: [number, number][] }) {
  const polyRef = useRef<L.Polyline | null>(null);
  const prevPositionsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    if (positions.length < 2) return;
    // Provjeri je li track zaista promijenjen
    const prev = prevPositionsRef.current;
    const changed =
      prev.length !== positions.length ||
      (positions[0]?.[0] !== prev[0]?.[0] || positions[0]?.[1] !== prev[0]?.[1]);

    prevPositionsRef.current = positions;
    if (!changed && prev.length > 0) return;

    const poly = polyRef.current;
    if (!poly) return;

    // Kratka odgoda da Leaflet renderira SVG element
    requestAnimationFrame(() => {
      const el = poly.getElement() as SVGPathElement | null;
      if (!el) return;
      const length = el.getTotalLength ? el.getTotalLength() : 2000;
      el.style.transition = 'none';
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;
      // Force reflow
      void el.getBoundingClientRect();
      el.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.strokeDashoffset = '0';
    });
  }, [positions]);

  if (positions.length < 2) return null;

  return (
    <Polyline
      ref={polyRef}
      positions={positions}
      color="#f59e0b"
      weight={2}
      opacity={0.75}
    />
  );
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

function MapContent({ vessels, selectedMmsi, track, onSelect, showHeatmap }: Props & { showHeatmap: boolean }) {
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
      {showHeatmap && <HeatmapLayer vessels={vessels} />}
      <AnimatedTrack positions={trackPositions} />
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
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          showHeatmap={showHeatmap}
        />
      </MapContainer>

      <button
        onClick={() => setShowHeatmap(h => !h)}
        title={showHeatmap ? 'Isključi heatmap' : 'Uključi heatmap gustoće prometa'}
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: showHeatmap ? '#ef4444' : 'var(--bg-surface)',
          border: `1px solid ${showHeatmap ? '#ef4444' : 'var(--border-color)'}`,
          color: showHeatmap ? '#fff' : 'var(--text-muted)',
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background 0.2s, color 0.2s, border-color 0.2s',
          letterSpacing: '0.03em',
        }}
      >
        <span style={{ fontSize: 14 }}>🔥</span>
        Heatmap
      </button>
    </div>
  );
}
