import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { VesselLive } from '../types';

function vesselColor(v: VesselLive): string {
  if (v.nav_status === 1 || v.nav_status === 5) return '#94a3b8'; // sidro/vez
  const sog = v.sog ?? 0;
  if (sog < 0.5)  return '#475569'; // gotovo stacionaran
  if (sog < 5)    return '#3b82f6'; // sporo  — plava
  if (sog < 12)   return '#10b981'; // srednje — zelena
  return '#f59e0b';                 // brzo    — jantarna
}

function buildIcon(v: VesselLive, selected: boolean) {
  const angle = (v.cog ?? v.heading ?? 0) - 180;
  const color  = selected ? '#ef4444' : vesselColor(v);
  const size   = selected ? 22 : 18;
  const half   = size / 2;

  const pulse = selected
    ? `<div style="
        position:absolute; top:50%; left:50%;
        width:32px; height:32px; margin:-16px 0 0 -16px;
        border-radius:50%; border:2px solid #ef4444;
        animation:pulseRing 1.4s ease-out infinite;
        pointer-events:none;
      "></div>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="
          width:0; height:0;
          border-left:${half - 1}px solid transparent;
          border-right:${half - 1}px solid transparent;
          border-bottom:${size}px solid ${color};
          transform:rotate(${angle}deg);
          transform-origin:center ${half}px;
          position:relative; z-index:1;
          filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));
        "></div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

interface Props {
  vessel: VesselLive;
  selected: boolean;
  onClick: () => void;
}

export function VesselMarker({ vessel, selected, onClick }: Props) {
  if (vessel.lat == null || vessel.lon == null) return null;

  const sog = vessel.sog ?? 0;
  const statusLabel =
    vessel.nav_status === 1 ? 'Sidreno' :
    vessel.nav_status === 5 ? 'Privezano' :
    sog < 0.5 ? 'Stacionarno' :
    sog < 5   ? `${sog.toFixed(1)} kn` :
    sog < 12  ? `${sog.toFixed(1)} kn` :
                `${sog.toFixed(1)} kn ⚡`;

  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={buildIcon(vessel, selected)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          {vessel.name ?? `MMSI ${vessel.mmsi}`}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{statusLabel}</div>
      </Tooltip>
    </Marker>
  );
}
