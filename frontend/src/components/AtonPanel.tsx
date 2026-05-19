import type { AtonLive } from '../types';
import { aidTypeLabel, atonHealth, HEALTH_COLOR, LIGHT_STATUS, RACON_STATUS } from '../aton';

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginRight: 8 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

interface Props {
  aton: AtonLive;
  onClose: () => void;
  isMobile: boolean;
}

export function AtonPanel({ aton, onClose, isMobile }: Props) {
  const health = atonHealth(aton);
  const healthColor = HEALTH_COLOR[health];

  const lightInfo = aton.light_status != null ? LIGHT_STATUS[aton.light_status] : null;
  const raconInfo = aton.racon_status != null ? RACON_STATUS[aton.racon_status] : null;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        maxHeight: '60vh',
        borderRadius: '16px 16px 0 0',
        zIndex: 2000,
        overflowY: 'auto',
      }
    : {
        position: 'absolute',
        top: 12, right: 12,
        width: 280,
        maxHeight: 'calc(100vh - 24px)',
        borderRadius: 12,
        zIndex: 1500,
        overflowY: 'auto',
      };

  return (
    <div style={{
      ...panelStyle,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: healthColor, flexShrink: 0,
          boxShadow: `0 0 6px ${healthColor}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {aton.name ?? `MMSI ${aton.mmsi}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>MMSI {aton.mmsi}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 18, padding: '0 4px',
            lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Alarmi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {aton.alarm && <StatusBadge label="⚠ ALARM" color="#ef4444" />}
        {aton.off_position && <StatusBadge label="⚓ Van pozicije" color="#f59e0b" />}
        {aton.virtual_aid && <StatusBadge label="Virtualni AtoN" color="#8b5cf6" />}
        {!aton.alarm && !aton.off_position && health === 'ok' && (
          <StatusBadge label="✓ Sve uredno" color="#22c55e" />
        )}
      </div>

      {/* Status bitovi */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Status
        </div>

        {/* Alarm bit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, marginBottom: 4, background: aton.alarm ? '#ef444422' : 'transparent', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 12 }}>Alarm</span>
          <StatusBadge
            label={aton.alarm == null ? 'N/A' : aton.alarm ? 'ALARM' : 'OK'}
            color={aton.alarm ? '#ef4444' : aton.alarm === false ? '#22c55e' : '#64748b'}
          />
        </div>

        {/* Svjetlo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, marginBottom: 4, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 12 }}>Svjetlo</span>
          {lightInfo
            ? <StatusBadge label={lightInfo.label} color={lightInfo.color} />
            : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>N/A</span>}
        </div>

        {/* RACON */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 12 }}>RACON</span>
          {raconInfo
            ? <StatusBadge label={raconInfo.label} color={raconInfo.color} />
            : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>N/A</span>}
        </div>
      </div>

      {/* Detalji */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Informacije
      </div>
      <Row label="Tip" value={aidTypeLabel(aton.aid_type)} />
      {aton.lat != null && aton.lon != null && (
        <Row
          label="Pozicija"
          value={`${aton.lat.toFixed(5)}° / ${aton.lon.toFixed(5)}°`}
        />
      )}
      {aton.last_seen && (
        <Row
          label="Zadnji signal"
          value={new Date(aton.last_seen).toLocaleTimeString('hr-HR')}
        />
      )}
      {aton.status_raw != null && (
        <Row
          label="Status (raw)"
          value={`0x${(aton.status_raw & 0xFF).toString(16).padStart(2, '0').toUpperCase()}`}
        />
      )}
    </div>
  );
}
