import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
          {aton.wind_speed != null && (
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
              {aton.wind_speed.toFixed(0)} kn{aton.air_temp != null ? ` · ${aton.air_temp.toFixed(0)}°C` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FlyToAton({ aton, isMobile }: { aton: AtonLive | null; isMobile: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (aton?.lat != null && aton?.lon != null) {
      const zoom = Math.max(map.getZoom(), 12);
      if (isMobile) {
        const targetPoint = map.project([aton.lat, aton.lon], zoom);
        // Compensate for the bottom sheet (~65vh) so the marker lands above it
        const offset = map.getSize().y * 0.3;
        const adjustedCenter = map.unproject(targetPoint.add([0, offset]), zoom);
        map.flyTo(adjustedCenter, zoom, { duration: 1.2 });
      } else {
        map.flyTo([aton.lat, aton.lon], zoom, { duration: 1.2 });
      }
    }
  }, [aton, map, isMobile]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

interface Props {
  atons: AtonLive[];
  loading: boolean;
  onBack?: () => void;
}

export function AtonView({ atons, loading, onBack }: Props) {
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [search, setSearch] = useState('');
  const [isMobile] = useState(() => window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
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
    // flex: 1 + minWidth: 0 → ispunjava AppShell prostor bez overflow-a
    <div style={{
      display: 'flex',
      flex: 1,
      minWidth: 0,
      height: '100%',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1040,
          }}
        />
      )}

      {/* Lijeva bočna traka */}
      <div style={{
        ...(isMobile ? {
          position: 'absolute',
          top: 0,
          left: sidebarOpen ? 0 : -280,
          height: '100%',
          zIndex: 1050,
          transition: 'left 0.25s ease',
        } : {}),
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'none', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 8px',
                  cursor: 'pointer', fontSize: 12,
                }}
              >← Brodovi</button>
            )}
            <span style={{ fontWeight: 700, fontSize: 14, flex: 1, color: 'var(--text-primary)' }}>AtoN Pregled</span>
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
              background: 'var(--bg-base)',
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
              onClick={() => {
                setSelectedMmsi(a.mmsi === selectedMmsi ? null : a.mmsi);
                if (isMobile) setSidebarOpen(false);
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--border-color)',
          fontSize: 10,
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Ukupno: {atons.length}</span>
          <span>Prikazano: {filtered.length}</span>
        </div>
      </div>

      {/* Karta — flex: 1 + minWidth: 0 + overflow: hidden daje Leafletu pravi prostor */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(s => !s)}
            style={{
              position: 'fixed',
              top: 52,
              left: 12,
              zIndex: 9999,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              lineHeight: 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ☰
          </button>
        )}
        <MapContainer
          center={[44.5, 15.0]}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={tileUrl} attribution="© CartoDB" />
          <ZoomControl position="bottomright" />
          <MapInvalidator />
          <FlyToAton aton={selectedAton} isMobile={isMobile} />
          {mapAtons.map(a => (
            <AtonMarker
              key={a.mmsi}
              aton={a}
              selected={a.mmsi === selectedMmsi}
              onClick={mmsi => setSelectedMmsi(mmsi === selectedMmsi ? null : mmsi)}
            />
          ))}
        </MapContainer>

        {/* Panel s detaljima — overlay na karti */}
        {selectedAton && !isMobile && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            width: 300,
            maxHeight: 'calc(100% - 32px)',
            zIndex: 1500,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <AtonPanel aton={selectedAton} onClose={() => setSelectedMmsi(null)} />
          </div>
        )}

        {/* Mobile: bottom sheet */}
        {selectedAton && isMobile && (
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            maxHeight: '65vh',
            zIndex: 2000,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-color)' }} />
            </div>
            <AtonPanel aton={selectedAton} onClose={() => setSelectedMmsi(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
