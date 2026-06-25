import { useState } from 'react';
import { formatDcpa, formatTcpa, vesselName, type ColregType, type Encounter } from './collision';
import type { CollisionLevel } from './useCollisionWatch';

const MONO = 'var(--font-mono)';

const COLREG_LABEL: Record<ColregType, string> = {
  'head-on': 'Pramac u pramac',
  crossing: 'Presijecanje',
  overtaking: 'Pretjecanje',
  unknown: 'Približavanje',
};

interface Props {
  level: CollisionLevel;
  encounters: Encounter[];
  onSelect: (mmsi: number) => void;
  isMobile: boolean;
  topOffset: number;
}

function criColor(cri: number): string {
  if (cri >= 0.7) return '#ef4444';
  if (cri >= 0.4) return '#f59e0b';
  return '#38bdf8';
}

/** Ploča s popisom rizičnih parova — CPA/TCPA, CRI i COLREG savjet. */
export function CollisionPanel({ level, encounters, onSelect, isMobile, topOffset }: Props) {
  const [open, setOpen] = useState(!isMobile);
  const count = encounters.length;

  const headColor = level === 'alarm' ? '#ef4444' : level === 'warning' ? '#f59e0b' : 'var(--accent)';

  // Na mobitelu sjedi dolje-lijevo (iznad gumba za recentriranje) da ne pokriva
  // statusnu ploču kanala koja je na vrhu punom širinom; na desktopu gore-lijevo.
  const anchor: React.CSSProperties = isMobile
    ? { bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))', left: 12, right: 12 }
    : { top: topOffset, left: 12 };

  // Sklopljeno: kompaktni gumb (osobito na mobitelu) koji javlja broj rizika.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          ...(isMobile
            ? { bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))', left: 12 }
            : { top: topOffset, left: 12 }),
          zIndex: 1000,
          background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
          border: `1px solid ${count > 0 ? headColor : 'var(--border-color)'}`,
          color: count > 0 ? headColor : 'var(--text-secondary)',
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: level === 'alarm' ? 'alertGlow 1.1s ease-in-out infinite' : 'none',
        }}
      >
        🛟 Sudari{count > 0 ? ` (${count})` : ''}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      ...anchor,
      zIndex: 1000,
      width: isMobile ? 'auto' : 304,
      background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${count > 0 ? headColor : 'var(--border-color)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: level === 'alarm' ? `0 4px 28px ${headColor}66` : '0 4px 24px rgba(0,0,0,0.5)',
      animation: level === 'alarm' ? 'alertGlow 1.2s ease-in-out infinite' : 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: headColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: MONO }}>
          🛟 Rizik sudara{count > 0 ? ` · ${count}` : ''}
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <div style={{ maxHeight: isMobile ? 150 : 280, overflowY: 'auto', padding: '6px 10px' }}>
        {count === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-dimmer)', padding: '10px 4px', textAlign: 'center' }}>
            Nema rizika sudara — putanje su čiste
          </div>
        ) : (
          encounters.map((e) => {
            const c = criColor(e.cri);
            return (
              <div
                key={e.id}
                style={{
                  marginBottom: 6,
                  borderRadius: 8,
                  padding: '7px 9px',
                  background: e.level === 'alarm' ? 'rgba(239,68,68,0.10)' : 'var(--bg-surface-hover)',
                  border: `1px solid ${e.level === 'alarm' ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
                }}
              >
                {/* Plovila */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => onSelect(e.a.vessel.mmsi)}
                    style={nameBtn}
                  >
                    {vesselName(e.a.vessel)}
                  </button>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>⇄</span>
                  <button
                    onClick={() => onSelect(e.b.vessel.mmsi)}
                    style={nameBtn}
                  >
                    {vesselName(e.b.vessel)}
                  </button>
                </div>

                {/* Metrike */}
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-secondary)', fontFamily: MONO, marginBottom: 5 }}>
                  <span>TCPA <b style={{ color: 'var(--text-primary)' }}>{formatTcpa(e.tcpa)}</b></span>
                  <span>DCPA <b style={{ color: 'var(--text-primary)' }}>{formatDcpa(e.dcpa)}</b></span>
                  <span style={{ marginLeft: 'auto', color: c, fontWeight: 800 }}>
                    CRI {(e.cri * 100).toFixed(0)}%
                  </span>
                </div>

                {/* CRI traka */}
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border-color)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${Math.round(e.cri * 100)}%`, height: '100%', background: c, transition: 'width 0.3s' }} />
                </div>

                {/* COLREG */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{
                    flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                    color: 'var(--accent)', background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)', borderRadius: 5, padding: '1px 6px',
                  }}>
                    {COLREG_LABEL[e.colreg.type]}
                  </span>
                  <span style={{ fontSize: 10.5, lineHeight: 1.35, color: 'var(--text-secondary)' }}>
                    {e.colreg.advice}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const nameBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};
