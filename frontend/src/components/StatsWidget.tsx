import type { VesselLive } from '../types';

interface Props {
  vessels: VesselLive[];
}

function dot(color: string) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      marginRight: 5,
      flexShrink: 0,
    }} />
  );
}

export function StatsWidget({ vessels }: Props) {
  const moving   = vessels.filter(v => v.nav_status !== 1 && v.nav_status !== 5 && (v.sog ?? 0) > 0.5);
  const anchored = vessels.filter(v => v.nav_status === 1 || v.nav_status === 5 || (v.sog ?? 0) <= 0.5);
  const avgSog   = moving.length
    ? (moving.reduce((s, v) => s + (v.sog ?? 0), 0) / moving.length).toFixed(1)
    : '—';

  const row = (label: string, value: string | number, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 11 }}>
        {dot(color)}{label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: 44,
      right: 12,
      zIndex: 1000,
      background: 'rgba(15,23,42,0.92)',
      backdropFilter: 'blur(6px)',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 160,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      color: '#e2e8f0',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Flota
      </div>
      {row('Ukupno', vessels.length, '#60a5fa')}
      {row('U plovidbi', moving.length, '#10b981')}
      {row('Sidreno/Vez', anchored.length, '#94a3b8')}
      {row('Avg brzina', `${avgSog} kn`, '#f59e0b')}
    </div>
  );
}
