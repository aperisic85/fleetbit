import { useMemo } from 'react';

interface ReplayControlProps {
  active: boolean;
  loading: boolean;
  playing: boolean;
  /** Trenutno vrijeme replaya (ms epoch). */
  time: number;
  /** Najraniji dostupni trenutak (ms epoch) — barem 48h unatrag. */
  min: number;
  /** Najkasniji trenutak (ms epoch) — "sada" u trenutku ulaska u replay. */
  max: number;
  /** Multiplikator brzine reprodukcije. */
  speed: number;
  /** Broj brodova prikazanih u trenutnom kadru. */
  vesselCount: number;
  onToggle: () => void;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onSpeed: (s: number) => void;
}

const SPEEDS = [10, 60, 300, 900];

function fmt(ms: number): string {
  return new Date(ms).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function speedLabel(s: number): string {
  return s >= 60 ? `${Math.round(s / 60)} min/s` : `${s}×`;
}

/** Koliko sati unatrag od kraja je trenutni položaj. */
function agoLabel(time: number, max: number): string {
  const diffMin = Math.max(0, Math.round((max - time) / 60000));
  if (diffMin < 1) return 'sada';
  if (diffMin < 60) return `−${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m ? `−${h} h ${m} min` : `−${h} h`;
}

export function ReplayControl(props: ReplayControlProps) {
  const { active, loading, playing, time, min, max, speed, vesselCount } = props;

  const pct = useMemo(() => {
    if (max <= min) return 0;
    return ((time - min) / (max - min)) * 100;
  }, [time, min, max]);

  const atEnd = time >= max - 500;

  // ── Neaktivno: mali gumb za ulazak u replay ─────────────────────────────
  if (!active) {
    return (
      <button
        onClick={props.onToggle}
        title="Premotaj stanje flote unatrag i pokreni replay (do 48h)"
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          borderRadius: 8,
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          letterSpacing: '0.03em',
        }}
      >
        <span style={{ fontSize: 14 }}>⏱</span>
        Replay
      </button>
    );
  }

  // ── Aktivno: puna kontrolna traka ───────────────────────────────────────
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'min(680px, calc(100% - 24px))',
        background: 'var(--bg-surface, #1e293b)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: 12,
        padding: '10px 14px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Gornji red: status + zatvori */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              background: 'rgba(245,158,11,0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            REPLAY
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {loading ? 'Učitavanje…' : fmt(time)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap' }}>
            {loading ? '' : `${agoLabel(time, max)} · ${vesselCount} brodova`}
          </span>
        </div>
        <button
          onClick={props.onToggle}
          title="Natrag na live"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            color: 'var(--text-secondary, #94a3b8)',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✕ Live
        </button>
      </div>

      {/* Vremenska traka */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={1000}
          value={time}
          disabled={loading}
          onChange={(e) => props.onSeek(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#f59e0b',
            cursor: loading ? 'wait' : 'pointer',
            margin: 0,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -2,
            left: 0,
            width: `${pct}%`,
            height: 4,
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      </div>

      {/* Donji red: kontrole reprodukcije + brzina */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => props.onSeek(min)}
            disabled={loading}
            title="Na početak (−48h)"
            style={ctrlBtn}
          >
            ⏮
          </button>
          <button
            onClick={props.onPlayPause}
            disabled={loading}
            title={playing ? 'Pauza' : atEnd ? 'Ponovi od početka' : 'Reproduciraj'}
            style={{
              ...ctrlBtn,
              background: '#f59e0b',
              color: '#0f172a',
              border: '1px solid #f59e0b',
              fontSize: 16,
              width: 40,
              height: 34,
            }}
          >
            {playing ? '⏸' : atEnd ? '↻' : '▶'}
          </button>
          <button
            onClick={() => props.onSeek(max)}
            disabled={loading}
            title="Na kraj (live trenutak)"
            style={ctrlBtn}
          >
            ⏭
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted, #64748b)', marginRight: 2 }}>brzina</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => props.onSpeed(s)}
              style={{
                background: speed === s ? 'rgba(245,158,11,0.18)' : 'transparent',
                border: `1px solid ${speed === s ? 'rgba(245,158,11,0.45)' : 'var(--border-color, rgba(255,255,255,0.12))'}`,
                color: speed === s ? '#fbbf24' : 'var(--text-secondary, #94a3b8)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {speedLabel(s)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
  color: 'var(--text-primary, #e2e8f0)',
  borderRadius: 6,
  width: 34,
  height: 34,
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
