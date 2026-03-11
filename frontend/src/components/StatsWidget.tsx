import type { VesselLive } from '../types';

interface Props {
  vessels: VesselLive[];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: color,
        borderRadius: 2,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

function SpeedRow({
  label, count, total, color,
}: { label: string; count: number; total: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>{count}</span>
      </div>
      <Bar value={count} max={total} color={color} />
    </div>
  );
}

export function StatsWidget({ vessels }: Props) {
  const total    = vessels.length;
  const anchored = vessels.filter(v => v.nav_status === 1 || v.nav_status === 5).length;
  const s0_5     = vessels.filter(v => v.nav_status !== 1 && v.nav_status !== 5 && (v.sog ?? 0) < 5).length;
  const s5_12    = vessels.filter(v => (v.sog ?? 0) >= 5 && (v.sog ?? 0) < 12).length;
  const s12p     = vessels.filter(v => (v.sog ?? 0) >= 12).length;
  const moving   = vessels.filter(v => (v.sog ?? 0) > 0.5 && v.nav_status !== 1 && v.nav_status !== 5);
  const avgSog   = moving.length
    ? (moving.reduce((s, v) => s + (v.sog ?? 0), 0) / moving.length).toFixed(1)
    : '—';

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(44px + env(safe-area-inset-bottom, 0px))',
      right: 12,
      zIndex: 1000,
      background: 'rgba(15,23,42,0.93)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #334155',
      borderRadius: 10,
      padding: '12px 14px',
      minWidth: 172,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      color: '#e2e8f0',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Flota
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontWeight: 700, color: '#34d399',
          background: 'rgba(52,211,153,0.12)',
          border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: 10, padding: '2px 6px',
        }}>
          <span style={{ animation: 'pulseRing 1.5s ease-out infinite', display: 'inline-block', fontSize: 8 }}>●</span>
          LIVE
        </span>
      </div>

      {/* Ukupno */}
      <div style={{ textAlign: 'center', marginBottom: 10, padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>brodova aktivno</div>
      </div>

      {/* Distribucija brzine */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Brzina
      </div>
      <SpeedRow label="Sidreno / Vez" count={anchored} total={total} color="#94a3b8" />
      <SpeedRow label="Sporo  < 5 kn"  count={s0_5}    total={total} color="#3b82f6" />
      <SpeedRow label="5 – 12 kn"       count={s5_12}   total={total} color="#10b981" />
      <SpeedRow label="Brzo  12+ kn"    count={s12p}    total={total} color="#f59e0b" />

      {/* Avg */}
      <div style={{
        marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>Avg brzina</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{avgSog} kn</span>
      </div>
    </div>
  );
}
