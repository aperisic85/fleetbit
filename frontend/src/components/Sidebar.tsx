import { useEffect, useRef, useState } from 'react';
import type { VesselLive } from '../types';
import { useTheme } from '../ThemeContext';

export type FilterStatus = 'all' | 'underway' | 'anchored';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onSelect: (mmsi: number) => void;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div style={{
      padding: '9px 12px',
      borderRadius: 8,
      border: '1px solid var(--bg-surface)',
      borderLeft: '3px solid var(--bg-surface)',
      background: 'var(--bg-base)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }} />
        <div className="skeleton" style={{ height: 13, flex: 1, maxWidth: '60%' }} />
        <div className="skeleton" style={{ height: 16, width: 52, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 2, marginBottom: 5 }} />
      <div className="skeleton" style={{ height: 10, width: 80 }} />
    </div>
  );
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
  return Math.min(100, (sog / 25) * 100);
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'Sva plovila'  },
  { key: 'underway', label: 'Na plovidbi'  },
  { key: 'anchored', label: 'U luci'       },
];

// Lupa SVG ikona
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// X clear ikona
function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Sidebar({ vessels, selectedMmsi, filter, onFilterChange, onSelect, loading = false }: Props) {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  // Animated filter slider
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [sliderLeft, setSliderLeft] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    const bar = filterBarRef.current;
    if (!bar) return;
    const activeEl = bar.querySelector(`[data-filterkey="${filter}"]`) as HTMLElement | null;
    if (!activeEl) return;
    setSliderLeft(activeEl.offsetLeft);
    setSliderWidth(activeEl.offsetWidth);
  }, [filter]);

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
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>⚓ FleetBit</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {loading ? (
              <span style={{ opacity: 0.5 }}>Učitavanje...</span>
            ) : (
              <>{vessels.length} plovila u floti</>
            )}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Prebaci na svjetlu temu' : 'Prebaci na tamnu temu'}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px 6px',
            fontSize: 14,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, border-color 0.2s',
            flexShrink: 0,
            marginTop: 2,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Search s ikonom i clear buttonom */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {/* Lupa ikona */}
          <span style={{
            position: 'absolute',
            left: 9,
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            <SearchIcon />
          </span>

          <input
            type="text"
            placeholder="Pretraži plovila..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              padding: '7px 30px 7px 30px',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          />

          {/* Clear button — prikaži samo kad ima teksta */}
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 7,
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: 3,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'; }}
              title="Obriši pretragu"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>

      {/* Filter pill tabs s animiranim sliderom */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          ref={filterBarRef}
          style={{
            position: 'relative',
            display: 'flex',
            gap: 2,
            background: 'var(--bg-base)',
            borderRadius: 22,
            padding: 3,
          }}
        >
          {/* Animirani slider u pozadini */}
          {sliderWidth > 0 && (
            <div style={{
              position: 'absolute',
              top: 3,
              left: sliderLeft + 3,
              width: sliderWidth,
              height: 'calc(100% - 6px)',
              background: '#2563eb',
              borderRadius: 18,
              transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
          )}

          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              data-filterkey={key}
              onClick={() => onFilterChange(key)}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 18,
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: filter === key ? '#fff' : 'var(--text-dim)',
                transition: 'color 0.2s',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading && Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && filtered.map((v) => {
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
                border: `1px solid ${isSelected ? color : 'var(--border-color)'}`,
                borderLeft: `3px solid ${color}`,
                background: isSelected ? `${color}18` : 'var(--bg-base)',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: isSelected ? `0 0 0 1px ${color}40, 0 2px 8px #0008` : '0 1px 3px #0004',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = 'var(--bg-surface-hover)';
                  el.style.boxShadow = `0 0 0 1px ${color}30, 0 2px 8px #0006`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = 'var(--bg-base)';
                  el.style.boxShadow = '0 1px 3px #0004';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: barWidth > 0 ? 6 : 4 }}>
                <span style={{ fontSize: 11, flexShrink: 0, color }}>{statusIcon(v)}</span>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                  {v.name ?? <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Nepoznato plovilo</span>}
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

              {barWidth > 0 && (
                <div style={{ height: 2, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              )}

              <div style={{ fontSize: 10, color: 'var(--text-dimmer)', letterSpacing: '0.03em' }}>
                MMSI {v.mmsi}
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
            {search ? 'Nema rezultata' : 'Nema plovila u floti'}
          </div>
        )}
      </div>
    </div>
  );
}
