import { Polygon, Tooltip } from 'react-leaflet';
import { CHANNEL_POLYGON, SPEED_LIMIT_KN } from './channel';
import { ACCENT_GREEN } from '../lib/shipType';
import type { ChannelLevel } from './useChannelWatch';

// Leaflet postavlja boju kao SVG atribut (stroke/fill), gdje se CSS varijable ne
// resolvaju — zato konkretan hex. "Slobodan" prati command-zelenu, ostale razine
// zadržavaju semantičke boje (info/upozorenje/alarm).
const STYLES: Record<ChannelLevel, { color: string; fillOpacity: number; weight: number; dash?: string; className?: string }> = {
  clear:    { color: ACCENT_GREEN, fillOpacity: 0.07, weight: 1.5, dash: '6 6' },
  active:   { color: '#38bdf8',    fillOpacity: 0.14, weight: 2 },
  meeting:  { color: '#f59e0b',    fillOpacity: 0.20, weight: 2.5, className: 'channel-warning' },
  speeding: { color: '#ef4444',    fillOpacity: 0.25, weight: 3, className: 'channel-alarm' },
};

const LEVEL_TEXT: Record<ChannelLevel, string> = {
  clear: 'Kanal slobodan',
  active: 'Prolazak u tijeku',
  meeting: 'Upozorenje — više plovila u kanalu',
  speeding: 'Alarm — prekoračenje brzine',
};

/** Označena nadzorna zona Kanala sv. Ante — boja prati razinu stanja */
export function ChannelOverlay({ level }: { level: ChannelLevel }) {
  const s = STYLES[level];
  return (
    // key={level} prisiljava remount jer Leaflet ne ažurira className kroz setStyle
    <Polygon
      key={level}
      positions={CHANNEL_POLYGON}
      pathOptions={{
        color: s.color,
        weight: s.weight,
        fillColor: s.color,
        fillOpacity: s.fillOpacity,
        dashArray: s.dash,
        className: s.className,
      }}
    >
      <Tooltip sticky direction="top" opacity={1} className="vessel-tooltip">
        <div style={{ minWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>
            ⚓ Kanal sv. Ante
          </div>
          <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginBottom: 4 }}>
            {LEVEL_TEXT[level]}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Nadzorna zona · ograničenje {SPEED_LIMIT_KN} kn
          </div>
        </div>
      </Tooltip>
    </Polygon>
  );
}
