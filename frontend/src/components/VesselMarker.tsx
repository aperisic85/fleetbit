import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { VesselLive } from '../types';

function vesselColor(v: VesselLive): string {
  if (v.nav_status === 1 || v.nav_status === 5) return '#94a3b8';
  const sog = v.sog ?? 0;
  if (sog < 0.5)  return '#475569';
  if (sog < 5)    return '#3b82f6';
  if (sog < 12)   return '#10b981';
  return '#f59e0b';
}

function statusLabel(v: VesselLive): string {
  if (v.nav_status === 1) return 'Sidreno';
  if (v.nav_status === 5) return 'Privezano';
  const sog = v.sog ?? 0;
  if (sog < 0.5) return 'Stacionarno';
  if (sog >= 12) return `${sog.toFixed(1)} kn ⚡`;
  return `${sog.toFixed(1)} kn`;
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

function formatLastSeen(last_seen: string | null): string {
  if (!last_seen) return '—';
  const diff = Math.floor((Date.now() - new Date(last_seen).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

interface Props {
  vessel: VesselLive;
  selected: boolean;
  onClick: () => void;
}

export function VesselMarker({ vessel, selected, onClick }: Props) {
  if (vessel.lat == null || vessel.lon == null) return null;

  const color = selected ? '#ef4444' : vesselColor(vessel);
  const label = statusLabel(vessel);

  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={buildIcon(vessel, selected)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1} className="vessel-tooltip">
        <div style={{ minWidth: 148, maxWidth: 200 }}>
          {/* Vessel name */}
          <div style={{
            fontWeight: 700,
            fontSize: 12,
            color: '#e2e8f0',
            marginBottom: 6,
            borderBottom: '1px solid #334155',
            paddingBottom: 5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {vessel.name ?? `MMSI ${vessel.mmsi}`}
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{
              display: 'inline-block',
              width: 7, height: 7,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
          </div>

          {/* Speed + COG row */}
          {(vessel.sog != null || vessel.cog != null) && (
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#94a3b8', marginBottom: 5 }}>
              {vessel.sog != null && (
                <span>
                  <span style={{ color: '#64748b' }}>SOG </span>
                  <span style={{ color: '#cbd5e1' }}>{vessel.sog.toFixed(1)} kn</span>
                </span>
              )}
              {vessel.cog != null && (
                <span>
                  <span style={{ color: '#64748b' }}>COG </span>
                  <span style={{ color: '#cbd5e1' }}>{vessel.cog.toFixed(0)}°</span>
                </span>
              )}
              {vessel.heading != null && vessel.heading !== 511 && (
                <span>
                  <span style={{ color: '#64748b' }}>HDG </span>
                  <span style={{ color: '#cbd5e1' }}>{vessel.heading}°</span>
                </span>
              )}
            </div>
          )}

          {/* Footer: MMSI + last seen */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
            <span>MMSI {vessel.mmsi}</span>
            {vessel.last_seen && (
              <span style={{ color: '#334155' }}>
                {formatLastSeen(vessel.last_seen)} ago
              </span>
            )}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
