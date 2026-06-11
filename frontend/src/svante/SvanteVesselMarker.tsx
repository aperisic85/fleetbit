import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { VesselLive } from '../types';
import { SPEED_LIMIT_KN } from './channel';
import type { ChannelVessel } from './useChannelWatch';

// Boja po tipu broda (AIS ITU-R M.1371 kodovi, de-facto ECDIS konvencija)
function vesselColor(v: VesselLive): string {
  if (v.nav_status === 1 || v.nav_status === 5) return '#94a3b8'; // sidreno/privezano
  const t = v.ship_type ?? 0;
  if (t >= 80 && t <= 89) return '#ef4444'; // tankeri
  if (t >= 70 && t <= 79) return '#22c55e'; // teretni
  if (t >= 60 && t <= 69) return '#3b82f6'; // putnički
  if (t >= 30 && t <= 39) return '#f97316'; // ribolovni
  if (t >= 40 && t <= 49) return '#06b6d4'; // brzi (HSC)
  if (t >= 50 && t <= 59) return '#a855f7'; // servisni
  if (t >= 20 && t <= 28) return '#eab308'; // WIG
  if (t >= 90 && t <= 99) return '#f59e0b'; // ostali
  return '#64748b';
}

function buildIcon(v: VesselLive, opts: { selected: boolean; inChannel: boolean; speeding: boolean }) {
  const angle = v.cog ?? v.heading ?? 0;
  const color = opts.speeding ? '#ef4444' : opts.selected ? '#f59e0b' : vesselColor(v);
  const size = opts.selected || opts.inChannel ? 22 : 18;
  const half = size / 2;

  // Plovila u kanalu dobivaju prsten; prekršitelji brzine pulsiraju crveno
  const ring = opts.speeding
    ? `<div style="position:absolute;top:50%;left:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:2.5px solid #ef4444;animation:pulseRing 0.9s ease-out infinite;pointer-events:none;"></div>`
    : opts.inChannel
    ? `<div style="position:absolute;top:50%;left:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:2px solid #22d3ee;opacity:0.85;pointer-events:none;"></div>`
    : opts.selected
    ? `<div style="position:absolute;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;border:2px solid #f59e0b;animation:pulseRing 1.4s ease-out infinite;pointer-events:none;"></div>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        ${ring}
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
  channelInfo: ChannelVessel | null;
  selected: boolean;
  onClick: () => void;
}

export function SvanteVesselMarker({ vessel, channelInfo, selected, onClick }: Props) {
  if (vessel.lat == null || vessel.lon == null) return null;

  const inChannel = channelInfo != null;
  const speeding = channelInfo?.speeding ?? false;
  const color = speeding ? '#ef4444' : inChannel ? '#22d3ee' : vesselColor(vessel);
  const sog = vessel.sog;

  const statusText = speeding
    ? `⚠ ${sog?.toFixed(1)} kn — prekoračenje (limit ${SPEED_LIMIT_KN} kn)`
    : inChannel
    ? `U kanalu · ${sog != null ? `${sog.toFixed(1)} kn` : '—'}${
        channelInfo?.direction === 'inbound' ? ' · uplovljava' :
        channelInfo?.direction === 'outbound' ? ' · isplovljava' : ''
      }`
    : vessel.nav_status === 1 ? 'Sidreno'
    : vessel.nav_status === 5 ? 'Privezano'
    : (sog ?? 0) < 0.5 ? 'Stacionarno'
    : `${sog!.toFixed(1)} kn`;

  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={buildIcon(vessel, { selected, inChannel, speeding })}
      eventHandlers={{ click: onClick }}
      zIndexOffset={speeding ? 2000 : selected || inChannel ? 1000 : 0}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1} className="vessel-tooltip">
        <div style={{ minWidth: 148, maxWidth: 210 }}>
          <div style={{
            fontWeight: 700, fontSize: 12, color: '#e2e8f0', marginBottom: 6,
            borderBottom: '1px solid #334155', paddingBottom: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {vessel.name ?? `MMSI ${vessel.mmsi}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{statusText}</span>
          </div>
          {(vessel.cog != null || (vessel.heading != null && vessel.heading !== 511)) && (
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#94a3b8', marginBottom: 5 }}>
              {vessel.cog != null && (
                <span><span style={{ color: '#64748b' }}>COG </span><span style={{ color: '#cbd5e1' }}>{vessel.cog.toFixed(0)}°</span></span>
              )}
              {vessel.heading != null && vessel.heading !== 511 && (
                <span><span style={{ color: '#64748b' }}>HDG </span><span style={{ color: '#cbd5e1' }}>{vessel.heading}°</span></span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
            <span>MMSI {vessel.mmsi}</span>
            {vessel.last_seen && <span style={{ color: '#334155' }}>{formatLastSeen(vessel.last_seen)} ago</span>}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
