import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VesselLive, TrackPoint, AtonLive } from './types';
import { fetchLiveVessels, fetchTrack, createWebSocket, fetchLiveAtons } from './api';
import { Sidebar, type FilterStatus } from './components/Sidebar';
import { LiveMap } from './components/LiveMap';
import { VesselPanel } from './components/VesselPanel';
import { StatsWidget } from './components/StatsWidget';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AtonView } from './components/AtonView';
import { useAuth } from './AuthContext';

let toastIdCounter = 1;

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [mapResetKey, setMapResetKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mode, setMode] = useState<'vessels' | 'atons'>('vessels');
  const [atons, setAtons] = useState<AtonLive[]>([]);
  const [atonsLoading, setAtonsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const prevWsStatus = useRef<string>('connecting');

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
    fetchLiveVessels()
      .then((data) => {
        const map = new Map<number, VesselLive>();
        for (const v of data.vessels ?? []) map.set(v.mmsi, v);
        setVessels(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function connect() {
      setWsStatus('connecting');
      const ws = createWebSocket((data) => {
        const msg = data as { type: string; vessels?: VesselLive[]; position?: VesselLive };
        if (msg.type === 'snapshot' && Array.isArray(msg.vessels)) {
          setVessels((prev) => {
            const map = new Map(prev);
            for (const v of msg.vessels!) map.set(v.mmsi, v);
            return map;
          });
        } else if (msg.type === 'update' && msg.position?.mmsi != null) {
          const pos = msg.position;
          setVessels((prev) => {
            const updated = new Map(prev).set(pos.mmsi, { ...prev.get(pos.mmsi), ...pos });
            return updated;
          });
        }
      });
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }
    connect();
    return () => wsRef.current?.close();
  }, [addToast]);

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

  const mapVessels = useMemo(() => {
    const cutoff = Date.now() - 2 * 60 * 1000;
    const base = filteredVessels.filter(v => v.last_seen != null && new Date(v.last_seen).getTime() >= cutoff);
    if (selectedMmsi != null && !base.some(v => v.mmsi === selectedMmsi)) {
      const sel = vessels.get(selectedMmsi);
      if (sel?.lat != null && sel?.lon != null) return [...base, sel];
    }
    return base;
  }, [filteredVessels, selectedMmsi, vessels]);

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
            vessels={mapVessels}
            selectedMmsi={selectedMmsi}
            track={liveTrack}
            onSelect={handleSelect}
            mapResetKey={mapResetKey}
          />

          <StatsWidget vessels={vesselList} />

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
