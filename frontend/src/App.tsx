import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VesselLive, TrackPoint } from './types';
import { fetchLiveVessels, fetchTrack, createWebSocket } from './api';
import { Sidebar, type FilterStatus } from './components/Sidebar';
import { LiveMap } from './components/LiveMap';
import { VesselPanel } from './components/VesselPanel';
import { StatsWidget } from './components/StatsWidget';
import { ToastContainer, type ToastMessage } from './components/Toast';

let toastIdCounter = 1;

export default function App() {
  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const prevWsStatus = useRef<string>('connecting');
  // Rate-limit vessel update toasts — show max 1 per 4s
  const lastVesselToastRef = useRef<number>(0);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = toastIdCounter++;
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
          // Toast za odabrani brod
          setSelectedMmsi((sel) => {
            if (sel === pos.mmsi) {
              const now = Date.now();
              if (now - lastVesselToastRef.current > 4000) {
                lastVesselToastRef.current = now;
                const name = pos.name ?? `MMSI ${pos.mmsi}`;
                addToast(`${name} ažuriran`, 'info');
              }
            }
            return sel;
          });
        }
      });
      ws.onopen = () => {
        setWsStatus('connected');
      };
      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }
    connect();
    return () => wsRef.current?.close();
  }, [addToast]);

  // Toast za WS status promjene
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

  const handleSelect = (mmsi: number) => {
    setSelectedMmsi(mmsi);
    if (isMobile) setSidebarOpen(false);
  };

  const wsCfg = wsStatus === 'connected'
    ? { color: '#34d399', bg: '#34d39918', border: '#34d39940', label: 'Live', pulse: true }
    : wsStatus === 'connecting'
    ? { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b40', label: 'Spajanje...', pulse: true }
    : { color: '#f87171', bg: '#f8717118', border: '#f8717140', label: 'Offline', pulse: false };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

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
          onFilterChange={setFilter}
          onSelect={handleSelect}
          loading={loading}
        />
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>

        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: 12,
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
          vessels={filteredVessels}
          selectedMmsi={selectedMmsi}
          track={track}
          onSelect={handleSelect}
        />

        <StatsWidget vessels={vesselList} />

        {/* WS status badge — animirani pulsing dot */}
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

      {/* Toast notifikacije */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
