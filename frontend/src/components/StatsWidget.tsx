import { useEffect, useRef, useState } from 'react';
import type { VesselLive } from '../types';

// --- Animated counter ---

function useCountUp(target: number, duration = 550): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    let raf: number;
    const frame = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        prevRef.current = target;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

// --- Sparkline ---

const SPARK_CAPACITY = 30;
const SPARK_INTERVAL = 5000; // ms

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div style={{ height: 28 }} />;

  const W = 148, H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const last = values[values.length - 1];
  const lastX = W;
  const lastY = H - ((last - min) / range) * (H - 4) - 2;

  // Area fill: close path below the line
  const first = values[0];
  const firstY = H - ((first - min) / range) * (H - 4) - 2;
  const area = `M0,${firstY.toFixed(1)} L${pts.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, (_, x, y) => `${x},${y}`)} L${W},${H} L0,${H} Z`;

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY.toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

// --- SVG Icons ---

function IconShip({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20 18.5 20 22 12 12 8 12 3 8 3 8 8 2 20Z" />
      <path d="M6 20 6 14" />
    </svg>
  );
}

function IconAnchor({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="22" />
      <path d="M5 15H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

function IconSlow({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 12 12 5 19 12" />
      <line x1="12" y1="5" x2="12" y2="19" />
    </svg>
  );
}

function IconFast({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function IconSpeed({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 12 18 6" />
      <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}

// --- Bar ---

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 3, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function SpeedRow({ icon, label, count, total, color }: {
  icon: React.ReactNode; label: string; count: number; total: number; color: string;
}) {
  const animated = useCountUp(count);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{animated}</span>
      </div>
      <Bar value={count} max={total} color={color} />
    </div>
  );
}

// --- Main widget ---

interface Props { vessels: VesselLive[] }

export function StatsWidget({ vessels }: Props) {
  const total    = vessels.length;
  const anchored = vessels.filter(v => v.nav_status === 1 || v.nav_status === 5).length;
  const s0_5     = vessels.filter(v => v.nav_status !== 1 && v.nav_status !== 5 && (v.sog ?? 0) < 5).length;
  const s5_12    = vessels.filter(v => (v.sog ?? 0) >= 5 && (v.sog ?? 0) < 12).length;
  const s12p     = vessels.filter(v => (v.sog ?? 0) >= 12).length;
  const moving   = vessels.filter(v => (v.sog ?? 0) > 0.5 && v.nav_status !== 1 && v.nav_status !== 5);
  const avgSog   = moving.length
    ? moving.reduce((s, v) => s + (v.sog ?? 0), 0) / moving.length
    : 0;
  const avgSogDisplay = moving.length ? avgSog.toFixed(1) : '—';

  const animTotal = useCountUp(total);

  // Rolling sparkline buffer for avg speed
  const sparkRef = useRef<number[]>([]);
  const [sparkValues, setSparkValues] = useState<number[]>([]);
  const avgSogRef = useRef(avgSog);
  avgSogRef.current = avgSog;

  useEffect(() => {
    const tick = () => {
      const buf = sparkRef.current;
      buf.push(avgSogRef.current);
      if (buf.length > SPARK_CAPACITY) buf.shift();
      setSparkValues([...buf]);
    };
    tick();
    const id = setInterval(tick, SPARK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(44px + env(safe-area-inset-bottom, 0px))',
      right: 12,
      zIndex: 1000,
      background: 'color-mix(in srgb, var(--bg-base) 93%, transparent)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      padding: '12px 14px',
      width: 176,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      color: 'var(--text-primary)',
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

      {/* Total count — animated */}
      <div style={{ textAlign: 'center', marginBottom: 10, padding: '6px 0', borderBottom: '1px solid var(--bg-surface)' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {animTotal}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>plovila u floti</div>
      </div>

      {/* Speed rows */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Status flote
      </div>
      <SpeedRow icon={<IconAnchor color="#94a3b8" />} label="U luci / sidrištu" count={anchored} total={total} color="#94a3b8" />
      <SpeedRow icon={<IconShip color="#3b82f6" />}   label="Polazak  < 5 kn"   count={s0_5}    total={total} color="#3b82f6" />
      <SpeedRow icon={<IconSlow color="#10b981" />}   label="Krstarenje"         count={s5_12}   total={total} color="#10b981" />
      <SpeedRow icon={<IconFast color="#f59e0b" />}   label="Brza vožnja  12+"   count={s12p}    total={total} color="#f59e0b" />

      {/* Avg speed + sparkline */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-dim)' }}>
            <IconSpeed color="#f59e0b" />
            Avg brzina
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
            {avgSogDisplay} {moving.length ? 'kn' : ''}
          </span>
        </div>
        <Sparkline values={sparkValues} color="#f59e0b" />
      </div>
    </div>
  );
}
