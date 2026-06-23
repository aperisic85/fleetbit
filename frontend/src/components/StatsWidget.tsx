import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { VesselLive } from '../types';
import { SHIP_CLASSES, shipClass } from '../lib/shipType';

// ────────────────────────────────────────────────────────────────────────
// StatsWidget — Command Center varijanta.
// Drop-in zamjena: ISTI props (vessels: VesselLive[]) i ISTI export.
// ────────────────────────────────────────────────────────────────────────

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

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
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) raf = requestAnimationFrame(frame);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

const SPARK_CAPACITY = 30;
const SPARK_INTERVAL = 5000;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div style={{ height: 30 }} />;
  const W = 152, H = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 5) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastY = H - ((values[values.length - 1] - min) / range) * (H - 5) - 3;
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="ccSparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={area} fill="url(#ccSparkGrad)" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={W} cy={lastY.toFixed(1)} r="2.4" fill={color} />
    </svg>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 4, background: 'var(--bg-surface-hover)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function TypeRow({ swatch, label, count, total, color }: { swatch: ReactNode; label: string; count: number; total: number; color: string }) {
  const animated = useCountUp(count);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{swatch}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', width: 96, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <Bar value={count} max={total} color={color} />
      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: MONO, color: 'var(--text-primary)', width: 16, textAlign: 'right' }}>{animated}</span>
    </div>
  );
}

interface Props { vessels: VesselLive[] }

export function StatsWidget({ vessels }: Props) {
  const total = vessels.length;
  const moored = vessels.filter((v) => v.nav_status === 1 || v.nav_status === 5 || (v.sog ?? 0) <= 0.5).length;
  const underway = total - moored;
  const moving = vessels.filter((v) => (v.sog ?? 0) > 0.5 && v.nav_status !== 1 && v.nav_status !== 5);
  const avgSog = moving.length ? moving.reduce((s, v) => s + (v.sog ?? 0), 0) / moving.length : 0;
  const avgSogDisplay = moving.length ? avgSog.toFixed(1) : '—';

  const animUnderway = useCountUp(underway);
  const animMoored = useCountUp(moored);

  // Raspodjela po tipu plovila
  const byClass = Object.values(SHIP_CLASSES)
    .map((c) => ({ ...c, count: vessels.filter((v) => shipClass(v.ship_type).key === c.key).length }))
    .filter((c) => c.count > 0);

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
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      right: 12,
      zIndex: 1000,
      background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      padding: '13px 14px',
      width: 220,
      boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.2em', fontFamily: MONO }}>
          PREGLED FLOTE
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '2px 7px', fontFamily: MONO,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'ccLiveDot 1.5s infinite' }} />
          LIVE
        </span>
      </div>

      {/* Brojači */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '9px 4px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: 'var(--text-primary)', lineHeight: 1 }}>{animUnderway}</div>
          <div style={{ fontSize: 8, fontFamily: MONO, letterSpacing: '0.06em', color: 'var(--text-dim)', marginTop: 5 }}>U PLOVIDBI</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '9px 4px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: 'var(--text-secondary)', lineHeight: 1 }}>{animMoored}</div>
          <div style={{ fontSize: 8, fontFamily: MONO, letterSpacing: '0.06em', color: 'var(--text-dim)', marginTop: 5 }}>U LUCI</div>
        </div>
      </div>

      <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--text-dim)', marginBottom: 9, fontFamily: MONO }}>
        RASPODJELA PO TIPU
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {byClass.map((c) => (
          <TypeRow
            key={c.key}
            swatch={<span style={{ width: 7, height: 7, borderRadius: 2, display: 'block', background: c.color }} />}
            label={c.label} count={c.count} total={total} color={c.color}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--bg-surface-hover)' }}>
        <div>
          <div style={{ fontSize: 8.5, fontFamily: MONO, letterSpacing: '0.1em', color: 'var(--text-dim)' }}>PROSJEČNA BRZINA</div>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: MONO, color: 'var(--accent)', marginTop: 3 }}>
            {avgSogDisplay} <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{moving.length ? 'kn' : ''}</span>
          </div>
        </div>
        <Sparkline values={sparkValues} color="var(--accent)" />
      </div>
    </div>
  );
}
