import { useState } from 'react';
import type { ChannelEvent } from './useChannelWatch';

const TYPE_COLOR: Record<ChannelEvent['type'], string> = {
  info: '#38bdf8',
  warning: '#f59e0b',
  alarm: '#ef4444',
};

/** Dnevnik događaja u kanalu — ulazi, izlasci, upozorenja i alarmi */
export function EventLog({ events, isMobile }: { events: ChannelEvent[]; isMobile: boolean }) {
  const [open, setOpen] = useState(!isMobile);
  const hasAlarm = events.slice(0, 5).some((e) => e.type === 'alarm');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          right: 12,
          zIndex: 1000,
          background: 'rgba(10,16,30,0.92)',
          border: `1px solid ${hasAlarm ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: hasAlarm ? '#f87171' : '#94a3b8',
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        📋 Dnevnik {events.length > 0 && `(${events.length})`}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      right: 12,
      zIndex: 1000,
      width: isMobile ? 'calc(100% - 24px)' : 308,
      background: 'rgba(10,16,30,0.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          📋 Dnevnik događaja
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <div style={{ maxHeight: isMobile ? 130 : 190, overflowY: 'auto', padding: '6px 10px' }}>
        {events.length === 0 ? (
          <div style={{ fontSize: 11, color: '#475569', padding: '10px 4px', textAlign: 'center' }}>
            Nema zabilježenih događaja
          </div>
        ) : (
          events.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 2px' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: TYPE_COLOR[e.type], marginTop: 4,
                boxShadow: e.type !== 'info' ? `0 0 6px ${TYPE_COLOR[e.type]}` : 'none',
              }} />
              <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                {e.time.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{
                fontSize: 11,
                lineHeight: 1.35,
                color: e.type === 'alarm' ? '#f87171' : e.type === 'warning' ? '#fbbf24' : '#cbd5e1',
                fontWeight: e.type === 'info' ? 400 : 600,
              }}>
                {e.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
