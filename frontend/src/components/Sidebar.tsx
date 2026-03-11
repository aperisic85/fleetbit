import { useState } from 'react';
import type { VesselLive } from '../types';

export type FilterStatus = 'all' | 'underway' | 'anchored';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onSelect: (mmsi: number) => void;
}

function speedLabel(v: VesselLive): string {
  if (v.nav_status === 1) return 'Sidreno';
  if (v.nav_status === 5) return 'Privezano';
  const sog = v.sog ?? 0;
  if (sog < 0.5) return 'Stacionarno';
  return `${sog.toFixed(1)} kn`;
}

function speedColor(v: VesselLive): string {
  if (v.nav_status === 1 || v.nav_status === 5) return '#94a3b8';
  const sog = v.sog ?? 0;
  if (sog < 0.5)  return '#475569';
  if (sog < 5)    return '#3b82f6';
  if (sog < 12)   return '#10b981';
  return '#f59e0b';
}

function statusIcon(v: VesselLive): string {
  if (v.nav_status === 1) return '⚓';
  if (v.nav_status === 5) return '🔗';
  const sog = v.sog ?? 0;
  if (sog < 0.5) return '●';
  return '▶';
}

function speedBarWidth(v: VesselLive): number {
  if (v.nav_status === 1 || v.nav_status === 5) return 0;
  const sog = v.sog ?? 0;
  // Max ~25 kn → 100%
  return Math.min(100, (sog / 25) * 100);
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'Svi'         },
  { key: 'underway', label: 'U plovidbi'  },
  { key: 'anchored', label: 'Sidreni'     },
];

export function Sidebar({ vessels, selectedMmsi, filter, onFilterChange, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = [...vessels]
    .filter((v) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(v.name ?? '').toLowerCase().includes(q) && !String(v.mmsi).includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) =>
      (a.name ?? `MMSI ${a.mmsi}`).localeCompare(b.name ?? `MMSI ${b.mmsi}`)
    );

  return (
    <div style={{
      width: 260,
      background: '#1e293b',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>⚓ FleetBit</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
          {vessels.length} brodova aktivno
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>
        <input
          type="text"
          placeholder="Pretraži brodove..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#e2e8f0',
            padding: '7px 10px',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter pills */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 12px',
        borderBottom: '1px solid #334155',
      }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              background: filter === key ? '#2563eb' : '#0f172a',
              color: filter === key ? '#fff' : '#94a3b8',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vessel list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((v) => {
          const color = speedColor(v);
          const isSelected = selectedMmsi === v.mmsi;
          const barWidth = speedBarWidth(v);
          return (
            <div
              key={v.mmsi}
              onClick={() => onSelect(v.mmsi)}
              style={{
                padding: '9px 12px',
                cursor: 'pointer',
                borderRadius: 8,
                border: `1px solid ${isSelected ? color : '#334155'}`,
                borderLeft: `3px solid ${color}`,
                background: isSelected ? `${color}18` : '#0f172a',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: isSelected ? `0 0 0 1px ${color}40, 0 2px 8px #0008` : '0 1px 3px #0004',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = '#1e293b';
                  el.style.boxShadow = `0 0 0 1px ${color}30, 0 2px 8px #0006`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = '#0f172a';
                  el.style.boxShadow = '0 1px 3px #0004';
                }
              }}
            >
              {/* Top row: icon + name + status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: barWidth > 0 ? 6 : 4 }}>
                <span style={{ fontSize: 11, flexShrink: 0, color }}>{statusIcon(v)}</span>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: isSelected ? '#fff' : '#e2e8f0' }}>
                  {v.name ?? <span style={{ color: '#64748b', fontStyle: 'italic' }}>Nepoznat</span>}
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color,
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  borderRadius: 20,
                  padding: '1px 7px',
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}>
                  {speedLabel(v)}
                </span>
              </div>

              {/* Speed bar (samo za brodove u plovidbi) */}
              {barWidth > 0 && (
                <div style={{ height: 2, background: '#1e293b', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              )}

              {/* Bottom row: MMSI */}
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.03em' }}>
                MMSI {v.mmsi}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: '#64748b', fontSize: 13, textAlign: 'center' }}>
            {search ? 'Nema rezultata' : 'Nema aktivnih brodova'}
          </div>
        )}
      </div>
    </div>
  );
}
