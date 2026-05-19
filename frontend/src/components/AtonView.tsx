import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { AtonLive } from '../types';
import { AtonMarker } from './AtonMarker';
import { AtonPanel } from './AtonPanel';
import { atonHealth, HEALTH_COLOR, aidTypeLabel } from '../aton';
import { useTheme } from '../ThemeContext';

type HealthFilter = 'all' | 'alarm' | 'warning' | 'ok' | 'unknown';

function AtonListItem({
  aton,
  selected,
  onClick,
}: {
  aton: AtonLive;
  selected: boolean;
  onClick: () => void;
}) {
  const health = atonHealth(aton);
  const color = HEALTH_COLOR[health];

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderLeft: `3px solid ${selected ? color : 'transparent'}`,
        background: selected ? color + '15' : 'transparent',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: health === 'alarm' ? `0 0 5px ${color}` : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {aton.name ?? `MMSI ${aton.mmsi}`}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {aidTypeLabel(aton.aid_type)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {aton.alarm && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>⚠ ALARM</span>}
          {aton.off_position && <span style={{ fontSize: 9, color: '#f59e0b' }}>VAN POZ.</span>}
          {aton.virtual_aid && <span style={{ fontSize: 9, color: '#8b5cf6' }}>VIRT.</span>}
        </div>
      </div>
    </div>
  );
}

interface Props {
  atons: AtonLive[];
  loading: boolean;
  onBack: () => void;
}

export function AtonView({ atons, loading, onBack }: Props) {
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [search, setSearch] = useState('');
  const [isMobile] = useState(() => window.innerWidth <= 768);
  const { theme, toggleTheme } = useTheme();

  const selectedAton = selectedMmsi != null ? atons.find(a => a.mmsi === selectedMmsi) ?? null : null;

  const filtered = useMemo(() => {
    let list = atons;
    if (healthFilter !== 'all') list = list.filter(a => atonHealth(a) === healthFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        String(a.mmsi).includes(q)
      );
    }
    // sort: alarmi na vrhu, zatim po imenu
    return [...list].sort((a, b) => {
      const ha = atonHealth(a);
      const hb = atonHealth(b);
      const order: Record<string, number> = { alarm: 0, warning: 1, ok: 2, unknown: 3 };
      if (order[ha] !== order[hb]) return order[ha] - order[hb];
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [atons, healthFilter, search]);

  const counts = useMemo(() => ({
    alarm:   atons.filter(a => atonHealth(a) === 'alarm').length,
    warning: atons.filter(a => atonHealth(a) === 'warning').length,
    ok:      atons.filter(a => atonHealth(a) === 'ok').length,
    unknown: atons.filter(a => atonHealth(a) === 'unknown').length,
  }), [atons]);

  const mapAtons = useMemo(() => atons.filter(a => a.lat != null && a.lon != null), [atons]);

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif' }}>

      {/* Lijeva bočna traka */}
      <div style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        zIndex: 10,
      }}>
        {/* Header */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              onClick={onBack}
              style={{
                background: 'none', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 8px',
                cursor: 'pointer', fontSize: 12,
              }}
            >← Brodovi</button>
            <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>AtoN Pregled</span>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 8px',
                cursor: 'pointer', fontSize: 13,
              }}
            >{theme === 'dark' ? '☀' : '🌙'}</button>
          </div>

          {/* Status sažetak */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            {(['alarm', 'warning', 'ok', 'unknown'] as HealthFilter[]).filter(h => h !== 'all').map(h => (
              <div
                key={h}
                onClick={() => setHealthFilter(healthFilter === h ? 'all' : h)}
                style={{
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: `1px solid ${healthFilter === h ? HEALTH_COLOR[h] : 'var(--border-color)'}`,
                  background: healthFilter === h ? HEALTH_COLOR[h] + '20' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 10, color: HEALTH_COLOR[h], fontWeight: 600 }}>
                  {h === 'alarm' ? 'Alarm' : h === 'warning' ? 'Upozorenje' : h === 'ok' ? 'Uredno' : 'Nepoznato'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: HEALTH_COLOR[h] }}>
                  {counts[h as keyof typeof counts]}
                </span>
              </div>
            ))}
          </div>

          {/* Pretraga */}
          <input
            type="text"
            placeholder="Pretraži AtoN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input, var(--bg-surface))',
              color: 'var(--text-primary)',
              fontSize: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              Učitavanje...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              Nema AtoNa
            </div>
          )}
          {filtered.map(a => (
            <AtonListItem
              key={a.mmsi}
              aton={a}
              selected={a.mmsi === selectedMmsi}
              onClick={() => setSelectedMmsi(a.mmsi === selectedMmsi ? null : a.mmsi)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border-color)', fontSize: 10, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Ukupno: {atons.length}</span>
          <span>Prikazano: {filtered.length}</span>
        </div>
      </div>

      {/* Karta */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[44.5, 15.0]}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={tileUrl} attribution="© CartoDB" />
          <ZoomControl position="bottomright" />
          {mapAtons.map(a => (
            <AtonMarker
              key={a.mmsi}
              aton={a}
              selected={a.mmsi === selectedMmsi}
              onClick={mmsi => setSelectedMmsi(mmsi === selectedMmsi ? null : mmsi)}
            />
          ))}
        </MapContainer>

        {selectedAton && (
          <AtonPanel
            aton={selectedAton}
            onClose={() => setSelectedMmsi(null)}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}
