import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VesselLive, TrackPoint, AtonLive, ReplayPosition } from './types';
import { fetchTrack, fetchLiveAtons, fetchReplayRange } from './api';
import { useLiveVessels } from './useLiveVessels';
import { Sidebar, type FilterStatus } from './components/Sidebar';
import { LiveMap } from './components/LiveMap';
import { VesselPanel } from './components/VesselPanel';
import { StatsWidget } from './components/StatsWidget';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AtonView } from './components/AtonView';
import { ReplayControl } from './components/ReplayControl';
import { useAuth } from './AuthContext';

let toastIdCounter = 1;

// Replay: koliko sati unatrag je dostupno (zahtjev: barem 48h).
const REPLAY_WINDOW_H = 48;
// Brod se smatra prisutnim u kadru ako mu je zadnja pozicija unutar ovog
// prozora prije trenutnog vremena replaya.
const REPLAY_FRESH_MS = 30 * 60 * 1000;

/** Binarno traži indeks zadnje pozicije s time <= t (niz sortiran uzlazno). */
function lastIndexBefore(arr: ReplayPosition[], t: number): number {
  let lo = 0, hi = arr.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(arr[mid].time).getTime() <= t) { idx = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return idx;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { vessels, wsStatus, loading } = useLiveVessels();
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [mapResetKey, setMapResetKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mode, setMode] = useState<'vessels' | 'atons'>('vessels');
  const [atons, setAtons] = useState<AtonLive[]>([]);
  const [atonsLoading, setAtonsLoading] = useState(false);
  const prevWsStatus = useRef<string>('connecting');

  // ── Replay (premotavanje stanja flote unatrag) ──────────────────────────
  const [replayActive, setReplayActive] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(60);
  const [replayTime, setReplayTime] = useState(() => Date.now());
  const [replayBounds, setReplayBounds] = useState(() => ({ min: Date.now() - REPLAY_WINDOW_H * 3600_000, max: Date.now() }));
  // Pozicije grupirane po MMSI, sortirane uzlazno po vremenu.
  const replayDataRef = useRef<Map<number, ReplayPosition[]>>(new Map());
  const [replayDataVersion, setReplayDataVersion] = useState(0);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = toastIdCounter++;
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const enterReplay = useCallback(async () => {
    const max = Date.now();
    const min = max - REPLAY_WINDOW_H * 3600_000;
    setReplayBounds({ min, max });
    setReplayActive(true);
    setReplayPlaying(false);
    setReplayTime(min);
    setReplayLoading(true);
    try {
      const data = await fetchReplayRange(new Date(min).toISOString(), new Date(max).toISOString());
      const byMmsi = new Map<number, ReplayPosition[]>();
      // Podaci dolaze sortirani uzlazno po vremenu, pa su i po brodu uzlazni.
      for (const p of (data.positions ?? []) as ReplayPosition[]) {
        if (p.lat == null || p.lon == null) continue;
        const arr = byMmsi.get(p.mmsi);
        if (arr) arr.push(p);
        else byMmsi.set(p.mmsi, [p]);
      }
      replayDataRef.current = byMmsi;
      setReplayDataVersion((v) => v + 1);
      addToast(`Replay spreman: ${REPLAY_WINDOW_H}h, ${byMmsi.size} brodova`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Replay podaci nisu dostupni', 'error');
      setReplayActive(false);
    } finally {
      setReplayLoading(false);
    }
  }, [addToast]);

  const exitReplay = useCallback(() => {
    setReplayActive(false);
    setReplayPlaying(false);
    replayDataRef.current = new Map();
    setReplayDataVersion((v) => v + 1);
  }, []);

  const toggleReplay = useCallback(() => {
    if (replayActive) exitReplay();
    else void enterReplay();
  }, [replayActive, enterReplay, exitReplay]);

  const handlePlayPause = useCallback(() => {
    if (replayPlaying) { setReplayPlaying(false); return; }
    // Ako smo na kraju, kreni ispočetka.
    if (replayTime >= replayBounds.max - 500) setReplayTime(replayBounds.min);
    setReplayPlaying(true);
  }, [replayPlaying, replayTime, replayBounds.max, replayBounds.min]);

  useEffect(() => {
    if (mode !== 'atons') return;
    setAtonsLoading(true);
    fetchLiveAtons()
      .then((data) => setAtons(data.atons ?? []))
      .catch(console.error)
      .finally(() => setAtonsLoading(false));
  }, [mode]);

  useEffect(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (mobile) setSidebarOpen(false);

    const handleResize = () => {
      const m = window.innerWidth <= 768;
      setIsMobile(m);
      if (!m) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const prev = prevWsStatus.current;
    if (prev === wsStatus) return;
    prevWsStatus.current = wsStatus;
    if (wsStatus === 'connected' && prev !== 'connecting') {
      addToast('Konekcija uspostavljena', 'success');
    } else if (wsStatus === 'disconnected') {
      addToast('Konekcija prekinuta', 'error');
    }
  }, [wsStatus, addToast]);

  useEffect(() => {
    if (selectedMmsi == null) { setTrack([]); return; }
    fetchTrack(selectedMmsi, undefined, undefined, 2000)
      .then((data) => setTrack(data.track ?? []))
      .catch(console.error);
  }, [selectedMmsi]);

  const vesselList = useMemo(
    () => Array.from(vessels.values()).filter((v) => v.lat != null && v.lon != null),
    [vessels]
  );

  const filteredVessels = useMemo(() => {
    if (filter === 'underway')
      return vesselList.filter(v => v.nav_status !== 1 && v.nav_status !== 5 && (v.sog ?? 0) > 0.5);
    if (filter === 'anchored')
      return vesselList.filter(v => v.nav_status === 1 || v.nav_status === 5 || (v.sog ?? 0) <= 0.5);
    return vesselList;
  }, [vesselList, filter]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const mapVessels = useMemo(() => {
    const cutoff = now - 30 * 60 * 1000;
    const fresh = filteredVessels.filter(
      v => v.last_seen != null && new Date(v.last_seen).getTime() >= cutoff
    );
    if (selectedMmsi != null && !fresh.some(v => v.mmsi === selectedMmsi)) {
      const sel = vessels.get(selectedMmsi);
      if (sel?.lat != null && sel?.lon != null) return [...fresh, sel];
    }
    return fresh;
  }, [filteredVessels, selectedMmsi, vessels, now]);

  const liveTrack = useMemo(() => {
    if (selectedMmsi == null) return track;
    const vessel = vessels.get(selectedMmsi);
    if (!vessel?.lat || !vessel?.lon || !vessel?.last_seen) return track;
    const liveTime = new Date(vessel.last_seen).getTime();
    const filtered = track.filter(p => new Date(p.time).getTime() <= liveTime);
    const last = filtered[filtered.length - 1];
    if (!last || new Date(last.time).getTime() < liveTime) {
      return [...filtered, { time: vessel.last_seen, mmsi: vessel.mmsi, lat: vessel.lat, lon: vessel.lon, sog: vessel.sog, cog: vessel.cog }];
    }
    return filtered;
  }, [track, selectedMmsi, vessels]);

  // Animacijska petlja replaya — pomiče vrijeme prema naprijed dok ne dođe do kraja.
  useEffect(() => {
    if (!replayActive || !replayPlaying || replayLoading) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      setReplayTime((prev) => {
        const next = prev + dt * replaySpeed;
        if (next >= replayBounds.max) {
          setReplayPlaying(false);
          return replayBounds.max;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replayActive, replayPlaying, replayLoading, replaySpeed, replayBounds.max]);

  // Stanje flote u trenutku replaya — zadnja pozicija svakog broda do replayTime
  // (uz prozor svježine), obogaćeno imenom/tipom iz live podataka.
  const replayVessels = useMemo<VesselLive[]>(() => {
    if (!replayActive) return [];
    void replayDataVersion; // ovisnost: ponovo izračunaj kad se podaci učitaju
    const cutoff = replayTime - REPLAY_FRESH_MS;
    const out: VesselLive[] = [];
    for (const [mmsi, arr] of replayDataRef.current) {
      const idx = lastIndexBefore(arr, replayTime);
      if (idx < 0) continue;
      const p = arr[idx];
      if (new Date(p.time).getTime() < cutoff) continue;
      const meta = vessels.get(mmsi);
      out.push({
        mmsi,
        name: meta?.name ?? null,
        ship_type: meta?.ship_type ?? null,
        lat: p.lat,
        lon: p.lon,
        sog: p.sog,
        cog: p.cog,
        heading: p.heading ?? null,
        nav_status: p.nav_status ?? null,
        last_seen: p.time,
      });
    }
    return out;
  }, [replayActive, replayTime, replayDataVersion, vessels]);

  // Trag odabranog broda do trenutka replaya.
  const replayTrack = useMemo<TrackPoint[]>(() => {
    if (!replayActive || selectedMmsi == null) return [];
    void replayDataVersion;
    const arr = replayDataRef.current.get(selectedMmsi);
    if (!arr) return [];
    const idx = lastIndexBefore(arr, replayTime);
    if (idx < 0) return [];
    return arr.slice(0, idx + 1).map((p) => ({
      time: p.time, mmsi: p.mmsi, lat: p.lat, lon: p.lon, sog: p.sog, cog: p.cog,
    }));
  }, [replayActive, selectedMmsi, replayTime, replayDataVersion]);

  const displayVessels = replayActive ? replayVessels : mapVessels;
  const displayTrack = replayActive ? replayTrack : liveTrack;

  const handleSelect = (mmsi: number) => {
    setSelectedMmsi(mmsi);
    if (isMobile) setSidebarOpen(false);
  };

  const wsCfg = wsStatus === 'connected'
    ? { color: '#34d399', bg: '#34d39918', border: '#34d39940', label: 'Live', pulse: true }
    : wsStatus === 'connecting'
    ? { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b40', label: 'Spajanje...', pulse: true }
    : { color: '#f87171', bg: '#f8717118', border: '#f8717140', label: 'Offline', pulse: false };

  // Uloga u čitljivom obliku
  const roleLabel: Record<string, string> = { admin: 'Admin', moderator: 'Moderator', client: 'Klijent' };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden', flexDirection: 'column' }}>

      {/* Gornja traka s korisničkim info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        background: 'var(--bg-surface, #1e293b)',
        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        flexShrink: 0,
        zIndex: 1060,
        height: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚓</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #e2e8f0)' }}>
            Fleet<span style={{ color: '#38bdf8' }}>bit</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <>
              <span style={{
                fontSize: 12,
                color: 'var(--text-secondary, #94a3b8)',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.company_name ?? user.email}
              </span>
              <span style={{
                background: user.role === 'admin' ? 'rgba(239,68,68,0.15)' :
                  user.role === 'moderator' ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.12)',
                color: user.role === 'admin' ? '#f87171' :
                  user.role === 'moderator' ? '#fbbf24' : '#38bdf8',
                border: `1px solid ${user.role === 'admin' ? 'rgba(239,68,68,0.3)' :
                  user.role === 'moderator' ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.25)'}`,
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.03em',
              }}>
                {roleLabel[user.role] ?? user.role}
              </span>
            </>
          )}
          <button
            onClick={() => setMode(m => m === 'atons' ? 'vessels' : 'atons')}
            style={{
              background: mode === 'atons' ? 'rgba(56,189,248,0.15)' : 'transparent',
              border: `1px solid ${mode === 'atons' ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: mode === 'atons' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⚓ AtoN
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-secondary, #94a3b8)',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Odjava
          </button>
        </div>
      </div>

      {/* Glavni sadržaj */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* AtoN pregled — zamijeni cijeli sadržaj kad je aktivan */}
        {mode === 'atons' && (
          <AtonView
            atons={atons}
            loading={atonsLoading}
            onBack={() => setMode('vessels')}
          />
        )}

        {mode === 'vessels' && <>

        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1040,
            }}
          />
        )}

        {/* Sidebar */}
        <div style={{
          ...(isMobile ? {
            position: 'absolute',
            top: 0,
            left: sidebarOpen ? 0 : -280,
            height: '100%',
            zIndex: 1050,
            transition: 'left 0.25s ease',
          } : {}),
          flexShrink: 0,
        }}>
          <Sidebar
            vessels={filteredVessels}
            selectedMmsi={selectedMmsi}
            filter={filter}
            onFilterChange={(f) => { setFilter(f); if (f === 'all') setMapResetKey(k => k + 1); }}
            onSelect={handleSelect}
            loading={loading}
            onSearchClear={() => setMapResetKey(k => k + 1)}
          />
        </div>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>

          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                position: 'fixed',
                top: 52,
                left: 12,
                zIndex: 9999,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                lineHeight: 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ☰
            </button>
          )}

          <LiveMap
            vessels={displayVessels}
            selectedMmsi={selectedMmsi}
            track={displayTrack}
            onSelect={handleSelect}
            mapResetKey={mapResetKey}
            animateTrack={!replayActive}
          />

          <StatsWidget vessels={replayActive ? replayVessels : vesselList} />

          <ReplayControl
            active={replayActive}
            loading={replayLoading}
            playing={replayPlaying}
            time={replayTime}
            min={replayBounds.min}
            max={replayBounds.max}
            speed={replaySpeed}
            vesselCount={replayVessels.length}
            onToggle={toggleReplay}
            onPlayPause={handlePlayPause}
            onSeek={(t) => { setReplayPlaying(false); setReplayTime(t); }}
            onSpeed={setReplaySpeed}
          />

          <div style={{
            position: 'absolute',
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            left: 12,
            zIndex: 1000,
            background: wsCfg.bg,
            border: `1px solid ${wsCfg.border}`,
            borderRadius: 20,
            padding: '5px 10px 5px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: wsCfg.color,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            backdropFilter: 'blur(4px)',
            letterSpacing: '0.03em',
            transition: 'color 0.3s, background 0.3s, border-color 0.3s',
          }}>
            <span style={{
              display: 'inline-block',
              width: 7, height: 7,
              borderRadius: '50%',
              background: wsCfg.color,
              flexShrink: 0,
              transition: 'background 0.3s',
              animation: wsCfg.pulse ? 'wsPulse 1.4s ease-in-out infinite' : 'none',
            }} />
            {wsCfg.label}
          </div>

          {selectedMmsi != null && (
            <VesselPanel
              mmsi={selectedMmsi}
              livePosition={vessels.get(selectedMmsi) ?? null}
              onClose={() => setSelectedMmsi(null)}
              isMobile={isMobile}
            />
          )}
        </div>
        </>}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
