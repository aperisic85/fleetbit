import { SPEED_LIMIT_KN } from './channel';
import type { ChannelLevel, ChannelVessel } from './useChannelWatch';

// Status razine: "slobodan" nosi brand-zelenu, ostale zadržavaju semantičke
// boje (info/upozorenje/alarm). line/glow su zasebna polja jer se CSS varijable
// ne smiju nadovezivati s hex-alfom (npr. `var(--accent)45` je nevažeće).
const LEVEL_CFG: Record<ChannelLevel, { color: string; bg: string; line: string; glow: string; label: string; desc: string }> = {
  clear:    { color: 'var(--accent)', bg: 'var(--accent-soft)',        line: 'var(--accent-border)',                          glow: 'color-mix(in srgb, var(--accent) 40%, transparent)', label: 'KANAL SLOBODAN',     desc: 'Nema plovila u nadzornoj zoni' },
  active:   { color: '#38bdf8',       bg: 'rgba(56,189,248,0.10)',     line: 'rgba(56,189,248,0.45)',                         glow: 'rgba(56,189,248,0.40)',                              label: 'PROLAZAK U TIJEKU',  desc: '1 plovilo u kanalu' },
  meeting:  { color: '#f59e0b',       bg: 'rgba(245,158,11,0.12)',     line: 'rgba(245,158,11,0.45)',                         glow: 'rgba(245,158,11,0.40)',                              label: 'UPOZORENJE · SUSRET', desc: 'Više plovila istovremeno u kanalu' },
  speeding: { color: '#ef4444',       bg: 'rgba(239,68,68,0.14)',      line: 'rgba(239,68,68,0.45)',                          glow: 'rgba(239,68,68,0.40)',                               label: 'ALARM · BRZINA',     desc: `Prekoračenje limita od ${SPEED_LIMIT_KN} kn` },
};

function DirectionTag({ direction }: { direction: ChannelVessel['direction'] }) {
  if (direction == null) return null;
  const inbound = direction === 'inbound';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
      color: inbound ? '#38bdf8' : '#a78bfa',
      background: inbound ? 'rgba(56,189,248,0.12)' : 'rgba(167,139,250,0.12)',
      border: `1px solid ${inbound ? 'rgba(56,189,248,0.35)' : 'rgba(167,139,250,0.35)'}`,
      borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap',
    }}>
      {inbound ? '→ ŠIBENIK' : '→ MORE'}
    </span>
  );
}

interface Props {
  level: ChannelLevel;
  channelVessels: ChannelVessel[];
  onSelect: (mmsi: number) => void;
  isMobile: boolean;
  topOffset: number;
}

/** Statusna ploča Kanala sv. Ante — zamjenjuje stari StatsWidget */
export function ChannelPanel({ level, channelVessels, onSelect, isMobile, topOffset }: Props) {
  const cfg = LEVEL_CFG[level];
  const count = channelVessels.length;

  return (
    <div style={{
      position: 'absolute',
      top: topOffset,
      right: 12,
      ...(isMobile ? { left: 12, width: 'auto' } : { width: 290 }),
      zIndex: 1000,
      background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${level === 'clear' || level === 'active' ? 'var(--border-color)' : cfg.line}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: level === 'speeding'
        ? `0 4px 28px ${cfg.glow}`
        : '0 4px 24px rgba(0,0,0,0.5)',
      color: 'var(--text-primary)',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Zaglavlje */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 8px',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
          ⚓ Kanal sv. Ante
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontWeight: 700, color: 'var(--accent)',
          background: 'var(--accent-soft)',
          border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '2px 7px',
        }}>
          <span style={{ animation: 'pulseRing 1.5s ease-out infinite', display: 'inline-block', fontSize: 8 }}>●</span>
          NADZOR
        </span>
      </div>

      {/* Statusna traka */}
      <div style={{
        margin: '0 12px 10px',
        background: cfg.bg,
        border: `1px solid ${cfg.line}`,
        borderRadius: 9,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: level === 'speeding' ? 'alertGlow 1.1s ease-in-out infinite' : 'none',
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0,
          boxShadow: `0 0 10px ${cfg.color}`,
          animation: level === 'meeting' || level === 'speeding' ? 'wsPulse 0.9s ease-in-out infinite' : 'none',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color, letterSpacing: '0.05em' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }}>
            {level === 'active' || level === 'meeting' ? `${count} ${count === 1 ? 'plovilo' : 'plovila'} u kanalu` : cfg.desc}
          </div>
        </div>
      </div>

      {/* Popis plovila u kanalu */}
      {count > 0 && (
        <div style={{ padding: '0 12px 10px', maxHeight: isMobile ? 150 : 260, overflowY: 'auto' }}>
          {channelVessels.map(({ vessel, speeding, direction }) => {
            const sog = vessel.sog ?? 0;
            return (
              <button
                key={vessel.mmsi}
                onClick={() => onSelect(vessel.mmsi)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'left',
                  background: speeding ? 'rgba(239,68,68,0.10)' : 'var(--bg-surface-hover)',
                  border: `1px solid ${speeding ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  marginBottom: 6,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 3,
                  }}>
                    {vessel.name?.trim() || `MMSI ${vessel.mmsi}`}
                  </div>
                  <DirectionTag direction={direction} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                    color: speeding ? '#f87171' : 'var(--accent)',
                  }}>
                    {sog.toFixed(1)} <span style={{ fontSize: 9, fontWeight: 600 }}>kn</span>
                  </div>
                  {speeding && (
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#f87171' }}>
                      +{(sog - SPEED_LIMIT_KN).toFixed(1)} preko limita
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Podnožje */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '7px 14px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--text-dim)',
      }}>
        <span>Ograničenje brzine</span>
        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{SPEED_LIMIT_KN} kn</span>
      </div>
    </div>
  );
}
