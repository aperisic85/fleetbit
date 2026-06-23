import { useEffect, useState } from 'react';

// ────────────────────────────────────────────────────────────────────────
// CommandHeader — gornja traka u Command Center stilu.
// Zamjenjuje inline header iz AppShell-a. Prima isto što shell već ima:
// user (iz useAuth), wsStatus, onLogout. Prekidač prikaza (mode/onModeChange)
// je opcionalan — prikazuje se samo ako ga shell proslijedi (charter ga nema).
// ────────────────────────────────────────────────────────────────────────

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

export type AppMode = 'vessels' | 'atons';
export type WsStatus = 'connected' | 'connecting' | 'disconnected';

interface HeaderUser {
  email: string;
  company_name?: string | null;
  role: string;
}

interface Props {
  user: HeaderUser | null;
  mode?: AppMode;
  onModeChange?: (m: AppMode) => void;
  wsStatus: WsStatus;
  onLogout: () => void;
  /** Naziv VTS sektora / postaje u oznaci lijevo. */
  station?: string;
}

const ROLE_LABEL: Record<string, string> = { admin: 'ADMIN', moderator: 'MODERATOR', client: 'KLIJENT' };

function pad(n: number) { return String(n).padStart(2, '0'); }

export function CommandHeader({ user, mode, onModeChange, wsStatus, onLogout, station = 'VTS · ŠIBENIK · SEKTOR 3' }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const d = new Date(now);
  const clock = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const dateStr = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;

  const ws = wsStatus === 'connected'
    ? { color: 'var(--accent)', label: 'AIS LINK', sub: 'aktivan · 99.4%', pulse: true }
    : wsStatus === 'connecting'
    ? { color: 'var(--c-warning)', label: 'SPAJANJE', sub: 'uspostavljam…', pulse: true }
    : { color: 'var(--c-alarm)', label: 'OFFLINE', sub: 'nema signala', pulse: false };

  const initials = (user?.company_name ?? user?.email ?? 'OP').slice(0, 2).toUpperCase();
  const views: { key: AppMode; label: string; icon: string }[] = [
    { key: 'vessels', label: 'Brodovi', icon: '◊' },
    { key: 'atons',   label: 'AtoN',    icon: '◈' },
  ];

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 54, flexShrink: 0,
      background: 'linear-gradient(180deg, var(--bg-surface), var(--bg-base))',
      borderBottom: '1px solid var(--border-color)', zIndex: 1060, color: 'var(--text-primary)',
    }}>
      {/* Lijevo — brand + postaja */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 11, height: 11, background: 'var(--accent)', transform: 'rotate(45deg)', boxShadow: '0 0 11px var(--accent)' }} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ font: `700 16px ${SANS}`, letterSpacing: '0.11em' }}>
              FLEET<span style={{ color: 'var(--accent)' }}>BIT</span>
            </div>
            <div style={{ font: `500 8px ${MONO}`, letterSpacing: '0.32em', color: 'var(--text-dim)', marginTop: 3 }}>
              MARITIME COMMAND
            </div>
          </div>
        </div>
        <div style={{ height: 28, width: 1, background: 'var(--border-color)' }} />
        <div style={{ font: `600 10px ${MONO}`, letterSpacing: '0.13em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: 'var(--accent)' }}>◈</span> {station}
        </div>
      </div>

      {/* Sredina — prekidač prikaza (samo kad shell podržava više modova) */}
      {onModeChange && (
        <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 3, gap: 2 }}>
          {views.map((v) => {
            const on = mode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => onModeChange(v.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px', borderRadius: 6, cursor: 'pointer',
                  border: 'none', font: `600 11px ${SANS}`, letterSpacing: '0.06em',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--text-dim)', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 11, color: on ? 'var(--accent)' : 'var(--text-dimmer)' }}>{v.icon}</span>
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Desno — sat, link, operater */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ lineHeight: 1.1, textAlign: 'right' }}>
          <div style={{ font: `600 16px ${MONO}`, letterSpacing: '0.03em' }}>{clock}</div>
          <div style={{ font: `500 8px ${MONO}`, letterSpacing: '0.16em', color: 'var(--text-dim)', marginTop: 3 }}>{dateStr} · UTC</div>
        </div>
        <div style={{ height: 28, width: 1, background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ws.color, boxShadow: `0 0 8px ${ws.color}`, animation: ws.pulse ? 'ccLiveDot 1.5s infinite' : 'none' }} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ font: `600 9px ${MONO}`, letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{ws.label}</div>
            <div style={{ font: `500 8px ${MONO}`, color: 'var(--text-dim)', marginTop: 2 }}>{ws.sub}</div>
          </div>
        </div>
        <div style={{ height: 28, width: 1, background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 11px ${MONO}`, color: 'var(--accent)',
          }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ font: `600 8px ${MONO}`, letterSpacing: '0.14em', color: 'var(--text-dim)' }}>OPERATER</div>
            <div style={{ font: `600 10px ${SANS}`, color: 'var(--text-secondary)', marginTop: 2 }}>
              {user?.company_name ?? user?.email ?? 'Gost'} · <span style={{ color: 'var(--accent)' }}>{ROLE_LABEL[user?.role ?? ''] ?? (user?.role ?? '').toUpperCase()}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dim)',
            borderRadius: 6, padding: '5px 12px', font: `600 10px ${MONO}`, letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          ODJAVA
        </button>
      </div>
    </header>
  );
}
