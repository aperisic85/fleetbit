import { useState } from 'react';
import type { VesselLive } from '../types';
import { useTheme } from '../ThemeContext';
import { vesselColor } from '../lib/shipType';

// ────────────────────────────────────────────────────────────────────────
// Sidebar — Command Center varijanta.
// Drop-in zamjena: ISTI props i ISTI export (Sidebar + FilterStatus).
// ────────────────────────────────────────────────────────────────────────

export type FilterStatus = 'all' | 'underway' | 'anchored';

interface Props {
  vessels: VesselLive[];
  selectedMmsi: number | null;
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onSelect: (mmsi: number) => void;
  loading?: boolean;
  onSearchClear?: () => void;
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function SkeletonCard() {
  return (
    <div style={{ padding: '9px 10px', borderRadius: 7, border: '1px solid var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div className="skeleton" style={{ width: 8, height: 8, flexShrink: 0 }} />
        <div className="skeleton" style={{ height: 12, flex: 1, maxWidth: '55%' }} />
        <div className="skeleton" style={{ height: 15, width: 48, borderRadius: 10 }} />
      </div>
      <div className="skeleton" style={{ height: 9, width: 120 }} />
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

function speedBarWidth(v: VesselLive): number {
  if (v.nav_status === 1 || v.nav_status === 5) return 0;
  return Math.min(100, ((v.sog ?? 0) / 25) * 100);
}

function isMoored(v: VesselLive): boolean {
  return v.nav_status === 1 || v.nav_status === 5 || (v.sog ?? 0) <= 0.5;
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'SVE'      },
  { key: 'underway', label: 'U PLOV.'  },
  { key: 'anchored', label: 'U LUCI'   },
];

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Sidebar({ vessels, selectedMmsi, filter, onFilterChange, onSelect, loading = false, onSearchClear }: Props) {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const counts = {
    all: vessels.length,
    underway: vessels.filter((v) => !isMoored(v)).length,
    anchored: vessels.filter((v) => isMoored(v)).length,
  };

  const filtered = [...vessels]
    .filter((v) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.name ?? '').toLowerCase().includes(q) || String(v.mmsi).includes(q);
    })
    .sort((a, b) => (a.name ?? `MMSI ${a.mmsi}`).localeCompare(b.name ?? `MMSI ${b.mmsi}`));

  return (
    <div className="cc-scroll" style={{
      width: 300,
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      height: '100%',
      borderRight: '1px solid var(--border-color)',
    }}>
      {/* Header */}
      <div style={{ padding: '13px 12px 11px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: 'var(--text-dim)', fontFamily: MONO }}>
            FLOTA · KONTAKTI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: MONO }}>
              {loading ? '··' : vessels.length}
            </span>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Svjetla tema' : 'Tamna tema'}
              style={{
                background: 'none', border: '1px solid var(--border-color)', borderRadius: 6,
                color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 5px', fontSize: 12, lineHeight: 1,
              }}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 9, color: 'var(--text-dimmer)', display: 'flex', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Traži ime ili MMSI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)',
              borderRadius: 7, color: 'var(--text-primary)', padding: '7px 28px 7px 28px',
              fontSize: 12, fontFamily: MONO, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); onSearchClear?.(); }}
              style={{ position: 'absolute', right: 7, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 3, display: 'flex', borderRadius: 4 }}
              title="Obriši pretragu"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips s brojačima */}
      <div style={{ position: 'relative', display: 'flex', gap: 5, padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        {FILTERS.map(({ key, label }) => {
          const on = filter === key;
          return (
            <button
              key={key}
              data-filterkey={key}
              onClick={() => onFilterChange(key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 2px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--accent-border)' : 'transparent'}`,
                background: on ? 'var(--accent-soft)' : 'var(--bg-base)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: on ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {counts[key]}
              </span>
              <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.03em', color: on ? 'var(--accent)' : 'var(--text-dim)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="cc-scroll" style={{ overflowY: 'auto', flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && filtered.map((v) => {
          const color = vesselColor(v.ship_type, v.nav_status);
          const isSelected = selectedMmsi === v.mmsi;
          const moored = isMoored(v);
          const barWidth = speedBarWidth(v);
          return (
            <div
              key={v.mmsi}
              onClick={() => onSelect(v.mmsi)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px', borderRadius: 7, cursor: 'pointer',
                border: `1px solid ${isSelected ? `color-mix(in srgb, ${color} 55%, transparent)` : 'transparent'}`,
                background: isSelected ? `color-mix(in srgb, ${color} 11%, transparent)` : 'transparent',
                transition: 'background 0.14s, border-color 0.14s',
              }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface-hover)'; }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 8, height: 8, flexShrink: 0, marginTop: 4,
                borderRadius: moored ? '50%' : 1,
                background: color,
                transform: moored ? 'none' : 'rotate(45deg)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto', minWidth: 0 }}>
                    {v.name ?? <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Nepoznato plovilo</span>}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, fontFamily: MONO, color,
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                    borderRadius: 10, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {speedLabel(v)}
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 9, fontFamily: MONO, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  MMSI {v.mmsi}
                </div>
                {barWidth > 0 && (
                  <div style={{ height: 2, background: 'var(--bg-surface-hover)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                )}
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
