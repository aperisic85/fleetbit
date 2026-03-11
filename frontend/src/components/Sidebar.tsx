import { useState } from 'react';
import type { VesselLive } from '../types';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  onSelect: (mmsi: number) => void;
}

export function Sidebar({ vessels, selectedMmsi, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = [...vessels]
    .filter((v) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.name ?? '').toLowerCase().includes(q) || String(v.mmsi).includes(q);
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
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>⚓ FleetBit</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
          {vessels.length} brodova aktivno
        </div>
      </div>

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
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {v.name ?? <span style={{ color: '#94a3b8' }}>Nepoznat</span>}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              MMSI: {v.mmsi}
              {v.sog != null && ` · ${v.sog.toFixed(1)} kn`}
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
