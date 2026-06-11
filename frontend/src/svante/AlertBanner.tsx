import { SPEED_LIMIT_KN } from './channel';
import type { ChannelLevel, ChannelVessel } from './useChannelWatch';

interface Props {
  level: ChannelLevel;
  channelVessels: ChannelVessel[];
  speedingVessels: ChannelVessel[];
  isMobile: boolean;
}

function label(v: ChannelVessel): string {
  return v.vessel.name?.trim() || `MMSI ${v.vessel.mmsi}`;
}

/** Veliki alarmni banner preko karte — samo za upozorenje/alarm */
export function AlertBanner({ level, channelVessels, speedingVessels, isMobile }: Props) {
  if (level !== 'meeting' && level !== 'speeding') return null;

  const alarm = level === 'speeding';
  const color = alarm ? '#ef4444' : '#f59e0b';

  const text = alarm
    ? speedingVessels.length === 1
      ? `${label(speedingVessels[0])} plovi ${(speedingVessels[0].vessel.sog ?? 0).toFixed(1)} kn — limit ${SPEED_LIMIT_KN} kn!`
      : `${speedingVessels.length} plovila prekoračuju ${SPEED_LIMIT_KN} kn u kanalu!`
    : `${channelVessels.length} plovila istovremeno u kanalu — mogući susret`;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1010,
      maxWidth: isMobile ? 'calc(100% - 24px)' : 560,
      width: isMobile ? 'calc(100% - 24px)' : 'auto',
      background: alarm ? 'rgba(69,10,10,0.94)' : 'rgba(69,40,4,0.94)',
      border: `1.5px solid ${color}`,
      borderRadius: 10,
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: `0 0 24px ${color}55, 0 4px 16px rgba(0,0,0,0.5)`,
      backdropFilter: 'blur(8px)',
      animation: alarm ? 'alertGlow 1s ease-in-out infinite' : 'none',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, animation: 'wsPulse 0.8s ease-in-out infinite' }}>
        {alarm ? '🚨' : '⚠️'}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.12em', marginBottom: 2 }}>
          {alarm ? 'ALARM · PREKORAČENJE BRZINE' : 'UPOZORENJE · SUSRET U KANALU'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fef2f2' }}>
          {text}
        </div>
      </div>
    </div>
  );
}
