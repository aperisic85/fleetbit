import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { AtonLive } from '../types';
import { atonHealth, HEALTH_COLOR } from '../aton';

function makeAtonIcon(health: string, color: string, virtual_aid: boolean): L.DivIcon {
  const size = 14;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6" fill="${color}" stroke="#fff" stroke-width="1.5"
        stroke-dasharray="${virtual_aid ? '3,2' : 'none'}" opacity="0.9"/>
      ${health === 'alarm' ? `<circle cx="7" cy="7" r="3" fill="#fff" opacity="0.9"/>` : ''}
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Props {
  aton: AtonLive;
  selected: boolean;
  onClick: (mmsi: number) => void;
}

export function AtonMarker({ aton, selected, onClick }: Props) {
  if (aton.lat == null || aton.lon == null) return null;

  const health = atonHealth(aton);
  const color = selected ? '#a78bfa' : HEALTH_COLOR[health];
  const icon = makeAtonIcon(health, color, aton.virtual_aid);

  const alarmLabel = aton.alarm ? ' ⚠ ALARM' : '';
  const offPosLabel = aton.off_position ? ' ⚓ VAN POZICIJE' : '';

  return (
    <Marker
      position={[aton.lat, aton.lon]}
      icon={icon}
      eventHandlers={{ click: () => onClick(aton.mmsi) }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Tooltip permanent={false} direction="top" offset={[0, -8]}>
        <div style={{ fontSize: 11, lineHeight: 1.5, minWidth: 130 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            {aton.name ?? `MMSI ${aton.mmsi}`}
            {alarmLabel}
            {offPosLabel}
          </div>
          <div style={{ color: '#94a3b8' }}>MMSI {aton.mmsi}</div>
        </div>
      </Tooltip>
    </Marker>
  );
}
