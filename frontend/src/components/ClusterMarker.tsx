import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';

interface Props {
  lat: number;
  lon: number;
  count: number;
  onClick: () => void;
}

function clusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const half = size / 2;
  // Outer ring + inner circle
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative; width:${size}px; height:${size}px;
        display:flex; align-items:center; justify-content:center;
      ">
        <div style="
          position:absolute; inset:0; border-radius:50%;
          background:rgba(37,99,235,0.25); border:2px solid rgba(96,165,250,0.6);
        "></div>
        <div style="
          width:${size - 12}px; height:${size - 12}px; border-radius:50%;
          background:rgba(37,99,235,0.85);
          display:flex; align-items:center; justify-content:center;
          font-size:${count < 100 ? 13 : 11}px;
          font-weight:700; color:#fff; font-family:system-ui,sans-serif;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
          position:relative; z-index:1;
        ">${count}</div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export function ClusterMarker({ lat, lon, count, onClick }: Props) {
  return (
    <Marker
      position={[lat, lon]}
      icon={clusterIcon(count)}
      eventHandlers={{ click: onClick }}
      zIndexOffset={-100}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
        <span style={{ fontSize: 12 }}>{count} plovila — klikni za zoom</span>
      </Tooltip>
    </Marker>
  );
}
