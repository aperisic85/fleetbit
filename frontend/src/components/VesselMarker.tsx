import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { VesselLive } from '../types';

const shipIcon = (heading: number | null) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 18px solid #2563eb;
      transform: rotate(${(heading ?? 0) - 180}deg);
      transform-origin: center bottom;
    "></div>`,
    iconSize: [12, 18],
    iconAnchor: [6, 9],
  });

interface Props {
  vessel: VesselLive;
  selected: boolean;
  onClick: () => void;
}

export function VesselMarker({ vessel, selected, onClick }: Props) {
  if (vessel.lat == null || vessel.lon == null) return null;

  const icon = selected
    ? L.divIcon({
        className: '',
        html: `<div style="
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 20px solid #dc2626;
          transform: rotate(${(vessel.heading ?? 0) - 180}deg);
          transform-origin: center bottom;
        "></div>`,
        iconSize: [14, 20],
        iconAnchor: [7, 10],
      })
    : shipIcon(vessel.heading);

  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        {vessel.name ?? `MMSI: ${vessel.mmsi}`}
      </Tooltip>
      <Popup>
        <strong>{vessel.name ?? 'Nepoznat brod'}</strong><br />
        MMSI: {vessel.mmsi}<br />
        SOG: {vessel.sog != null ? `${vessel.sog.toFixed(1)} kn` : '—'}<br />
        COG: {vessel.cog != null ? `${vessel.cog.toFixed(0)}°` : '—'}
      </Popup>
    </Marker>
  );
}
