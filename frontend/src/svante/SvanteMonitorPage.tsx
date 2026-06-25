import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { TrackPoint } from '../types';
import { fetchTrack } from '../api';
import { useLiveVessels } from '../useLiveVessels';
import { VesselPanel } from '../components/VesselPanel';
import { useAuth } from '../AuthContext';
import { SvanteMap } from './SvanteMap';
import { isInMonitorZone } from './channel';
import { ChannelPanel } from './ChannelPanel';
import { AlertBanner } from './AlertBanner';
import { EventLog } from './EventLog';
import { CollisionPanel } from './CollisionPanel';
import { useChannelWatch } from './useChannelWatch';
import { useCollisionWatch } from './useCollisionWatch';

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: MONO, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
      {now.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

interface Props {
  mode: 'guest' | 'app';
}

/**
 * Glavni VTS nadzorni ekran Kanala sv. Ante (Šibenik).
 * Prati prolaske kroz kanal, upozorava na susrete (2+ plovila u zoni)
 * i alarmira na prekoračenje ograničenja brzine (SPEED_LIMIT_KN).
 */
export default function SvanteMonitorPage({ mode }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const { vessels, wsStatus, loading } = useLiveVessels();
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('svante_sound') !== 'off');
  const [collisionOn, setCollisionOn] = useState(() => localStorage.getItem('svante_collision') !== 'off');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((s) => {
      localStorage.setItem('svante_sound', s ? 'off' : 'on');
      return !s;
    });
  }, []);

  const toggleCollision = useCallback(() => {
    setCollisionOn((c) => {
      localStorage.setItem('svante_collision', c ? 'off' : 'on');
      return !c;
    });
  }, []);

  // Trag odabranog plovila (samo za prijavljene)
  useEffect(() => {
    if (mode !== 'app' || selectedMmsi == null) return;
    fetchTrack(selectedMmsi, undefined, undefined, 2000)
      .then((data) => setTrack(data.track ?? []))
      .catch(console.error);
  }, [mode, selectedMmsi]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Samo svježa plovila (zadnjih 10 min) unutar nadzorne zone Kanala sv. Ante —
  // ostatak Jadrana se ne prati (manje markera, manje lažnih alarma).
  const mapVessels = useMemo(() => {
    const cutoff = now - 10 * 60 * 1000;
    const fresh = Array.from(vessels.values()).filter(
      (v) => v.lat != null && v.lon != null
        && isInMonitorZone(v.lat, v.lon)
        && v.last_seen != null && new Date(v.last_seen).getTime() >= cutoff
    );
    // Odabrani brod ostaje na karti i kad zastari — ima otvoren panel i trail.
    if (selectedMmsi != null && !fresh.some(v => v.mmsi === selectedMmsi)) {
      const sel = vessels.get(selectedMmsi);
      if (sel?.lat != null && sel?.lon != null) return [...fresh, sel];
    }
    return fresh;
  }, [vessels, now, selectedMmsi]);

  const watch = useChannelWatch(mapVessels, soundOn);
  const collision = useCollisionWatch(mapVessels, soundOn, collisionOn);

  // Objedinjeni dnevnik: kanal + rizik sudara, sortirano po vremenu (najnovije gore).
  const logEvents = useMemo(
    () => [...watch.events, ...collision.events]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 80),
    [watch.events, collision.events],
  );

  const collisionAlarm = useMemo(
    () => collision.encounters.find((e) => e.level === 'alarm') ?? null,
    [collision.encounters],
  );

  const handleSelect = useCallback((mmsi: number) => {
    setTrack([]);
    setSelectedMmsi(mmsi);
  }, []);

  const wsCfg = wsStatus === 'connected'
    ? { color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--accent-border)', label: 'LIVE', pulse: true }
    : wsStatus === 'connecting'
    ? { color: 'var(--c-warning)', bg: 'color-mix(in srgb, var(--c-warning) 16%, transparent)', border: 'color-mix(in srgb, var(--c-warning) 40%, transparent)', label: 'SPAJANJE', pulse: true }
    : { color: 'var(--c-alarm)', bg: 'color-mix(in srgb, var(--c-alarm) 16%, transparent)', border: 'color-mix(in srgb, var(--c-alarm) 40%, transparent)', label: 'OFFLINE', pulse: false };

  const bannerActive = watch.level === 'meeting' || watch.level === 'speeding' || collisionAlarm != null;
  const panelTop = isMobile && bannerActive ? 86 : 12;
  const showVesselPanel = mode === 'app' && selectedMmsi != null;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      overflow: 'hidden',
    }}>
      {/* ── Zaglavlje ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 16px',
        height: 52,
        flexShrink: 0,
        background: 'linear-gradient(180deg, var(--bg-surface), var(--bg-base))',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 1100,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #0b3b2a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, boxShadow: '0 0 14px color-mix(in srgb, var(--accent) 38%, transparent)',
          }}>⚓</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
              Kanal <span style={{ color: 'var(--accent)' }}>sv. Ante</span>
            </span>
            {!isMobile && (
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO }}>
                VTS nadzor prolaska · Šibenik
              </span>
            )}
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flexShrink: 0 }}>
          {!isMobile && <Clock />}

          {/* WS status */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 800, color: wsCfg.color, letterSpacing: '0.08em', fontFamily: MONO,
            background: wsCfg.bg,
            border: `1px solid ${wsCfg.border}`,
            borderRadius: 14, padding: '4px 10px',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: wsCfg.color,
              animation: wsCfg.pulse ? 'wsPulse 1.4s ease-in-out infinite' : 'none',
            }} />
            {wsCfg.label}
          </span>

          {/* Detekcija sudara */}
          <button
            onClick={toggleCollision}
            title={collisionOn ? 'Isključi detekciju sudara' : 'Uključi detekciju sudara'}
            style={{
              background: collisionOn ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${collisionOn ? 'var(--accent-border)' : 'var(--border-color)'}`,
              borderRadius: 8, padding: '5px 9px', fontSize: 14, cursor: 'pointer', lineHeight: 1,
              opacity: collisionOn ? 1 : 0.55,
            }}
          >
            🛟
          </button>

          {/* Zvuk alarma */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Isključi zvučni alarm' : 'Uključi zvučni alarm'}
            style={{
              background: soundOn ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${soundOn ? 'var(--accent-border)' : 'var(--border-color)'}`,
              borderRadius: 8, padding: '5px 9px', fontSize: 14, cursor: 'pointer', lineHeight: 1,
            }}
          >
            {soundOn ? '🔔' : '🔕'}
          </button>

          {/* Auth */}
          {mode === 'app' && user ? (
            <>
              {!isMobile && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.company_name ?? user.email}
                </span>
              )}
              <button
                onClick={() => { logout(); navigate('/', { replace: true }); }}
                style={{
                  background: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                }}
              >
                Odjava
              </button>
            </>
          ) : isAuthenticated ? (
            <Link to="/app" style={{
              background: 'var(--accent)', color: 'var(--bg-base)', textDecoration: 'none',
              fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              Otvori nadzor
            </Link>
          ) : (
            <Link to="/login" style={{
              background: 'var(--accent)', color: 'var(--bg-base)', textDecoration: 'none',
              fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              Prijava
            </Link>
          )}
        </div>
      </header>

      {/* ── Karta s nadzorom ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'var(--bg-base)', color: 'var(--text-dim)', fontSize: 14,
          }}>
            <span style={{ fontSize: 30, animation: 'wsPulse 1.2s ease-in-out infinite' }}>⚓</span>
            Učitavanje nadzora kanala...
          </div>
        )}

        <SvanteMap
          vessels={mapVessels}
          watch={watch}
          encounters={collision.encounters}
          selectedMmsi={selectedMmsi}
          track={showVesselPanel ? track : []}
          onSelect={handleSelect}
          resetKey={resetKey}
        />

        <AlertBanner
          level={watch.level}
          channelVessels={watch.channelVessels}
          speedingVessels={watch.speedingVessels}
          collisionAlarm={collisionAlarm}
          isMobile={isMobile}
        />

        {!showVesselPanel && (
          <ChannelPanel
            level={watch.level}
            channelVessels={watch.channelVessels}
            onSelect={handleSelect}
            isMobile={isMobile}
            topOffset={panelTop}
          />
        )}

        {collisionOn && (
          <CollisionPanel
            level={collision.level}
            encounters={collision.encounters}
            onSelect={handleSelect}
            isMobile={isMobile}
            topOffset={panelTop}
          />
        )}

        {showVesselPanel && (
          <VesselPanel
            mmsi={selectedMmsi!}
            livePosition={vessels.get(selectedMmsi!) ?? null}
            onClose={() => setSelectedMmsi(null)}
            isMobile={isMobile}
          />
        )}

        <EventLog events={logEvents} isMobile={isMobile} />

        {/* Recentriraj na kanal */}
        <button
          onClick={() => { setSelectedMmsi(null); setResetKey((k) => k + 1); }}
          title="Centriraj kartu na Kanal sv. Ante"
          style={{
            position: 'absolute',
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            left: 12,
            zIndex: 1000,
            background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⌖ Kanal
        </button>

        {/* Poziv na prijavu za goste */}
        {mode === 'guest' && !isAuthenticated && !isMobile && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
          }}>
            Za detalje o plovilima{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>prijavite se</Link>
          </div>
        )}
      </div>
    </div>
  );
}
