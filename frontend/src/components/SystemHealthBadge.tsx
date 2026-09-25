import { useEffect, useMemo, useState } from 'react';
import { fetchSystemHealth } from '../api';

type StationStatus = 'online' | 'degraded' | 'offline';

interface StationHealth {
  station_id: number;
  name: string;
  addr: string;
  status: StationStatus;
  connected: boolean;
  age_seconds: number | null;
  received_lines: number;
  parsed_messages: number;
  position_messages: number;
  parse_yield_pct: number;
  last_error: string | null;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  stations_total: number;
  stations_online: number;
  stations_degraded: number;
  stations_offline: number;
  stations: StationHealth[];
}

function ageLabel(seconds: number | null): string {
  if (seconds == null) return 'bez podataka';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export function SystemHealthBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = () => {
      fetchSystemHealth()
        .then((data) => { if (alive) setHealth(data as HealthResponse); })
        .catch(() => { if (alive) setHealth(null); });
    };

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const cfg = useMemo(() => {
    if (!health) return { color: '#f87171', label: 'AIS ?' };
    if (health.stations_offline > 0) return { color: '#f87171', label: `AIS ${health.stations_online}/${health.stations_total}` };
    if (health.stations_degraded > 0) return { color: '#fbbf24', label: `AIS ${health.stations_online}/${health.stations_total}` };
    return { color: '#34d399', label: `AIS ${health.stations_online}/${health.stations_total}` };
  }, [health]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="AIS System Health"
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.12)',
          color: cfg.color,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
        {cfg.label}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 34,
          width: 360,
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
          padding: 10,
          zIndex: 10000,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-secondary)', padding: '3px 5px 9px' }}>
            AIS SYSTEM HEALTH
          </div>

          {!health && (
            <div style={{ padding: 10, color: '#f87171', fontSize: 12 }}>
              Health podaci nisu dostupni
            </div>
          )}

          {health?.stations.map((s) => {
            const color = s.status === 'online' ? '#34d399' : s.status === 'degraded' ? '#fbbf24' : '#f87171';
            return (
              <div key={s.station_id} style={{
                padding: '8px 7px',
                borderTop: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: '10px 1fr auto',
                gap: 8,
                alignItems: 'center',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                    {s.addr} · zadnje {ageLabel(s.age_seconds)}
                  </div>
                  {s.last_error && s.status !== 'online' && (
                    <div style={{ fontSize: 9, marginTop: 2, color }}>{s.last_error}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, monospace' }}>
                  <div>{s.position_messages.toLocaleString()} pos</div>
                  <div>{s.parse_yield_pct.toFixed(0)}% parse</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
