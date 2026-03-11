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
  if (v.nav_status === 1) return '⚓ Sidreno';
  if (v.nav_status === 5) return '🔗 Privezano';
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
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map((v) => (
          <div
            key={v.mmsi}
            onClick={() => onSelect(v.mmsi)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #1e293b',
              background: selectedMmsi === v.mmsi ? '#1d4ed8' : 'transparent',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
            onMouseEnter={(e) => {
              if (selectedMmsi !== v.mmsi)
                (e.currentTarget as HTMLDivElement).style.background = '#334155';
            }}
            onMouseLeave={(e) => {
              if (selectedMmsi !== v.mmsi)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            {/* Speed color dot */}
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: speedColor(v),
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.name ?? <span style={{ color: '#94a3b8' }}>Nepoznat</span>}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {speedLabel(v)} · {v.mmsi}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
            {search ? 'Nema rezultata' : 'Nema aktivnih brodova'}
          </div>
        )}
      </div>
    </div>
  );
}
