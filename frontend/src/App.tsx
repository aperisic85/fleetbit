import { useEffect, useMemo, useRef, useState } from 'react';
import type { VesselLive, TrackPoint } from './types';
import { fetchLiveVessels, fetchTrack, createWebSocket } from './api';
import { Sidebar, type FilterStatus } from './components/Sidebar';
import { LiveMap } from './components/LiveMap';
import { VesselPanel } from './components/VesselPanel';
import { StatsWidget } from './components/StatsWidget';

export default function App() {
  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Inicijalni check — zatvori sidebar na mobileu
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

  // Inicijalni load
  useEffect(() => {
    fetchLiveVessels()
      .then((data) => {
        const map = new Map<number, VesselLive>();
        for (const v of data.vessels ?? []) map.set(v.mmsi, v);
        setVessels(map);
      })
      .catch(console.error);
  }, []);

  // WebSocket — real-time update
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
          setVessels((prev) => new Map(prev).set(pos.mmsi, { ...prev.get(pos.mmsi), ...pos }));
        }
      });
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  // Učitaj trag kad se odabere brod
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

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

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

      {/* Sidebar — overlay on mobile, normal on desktop */}
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
        />
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>

        {/* Hamburger button — only on mobile, position:fixed da Leaflet ne može pokriti */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 9999,
              background: '#1e293b',
              border: 'none',
              color: '#e2e8f0',
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

        {/* Stats widget */}
        <StatsWidget vessels={vesselList} />

        {/* WS status badge */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: '#0f172a',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          color: wsStatus === 'connected' ? '#34d399' : wsStatus === 'connecting' ? '#f59e0b' : '#f87171',
        }}>
          ● {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Spajanje...' : 'Disconnected'}
        </div>

        {/* Detalj odabranog broda */}
        {selectedMmsi != null && (
          <VesselPanel
            mmsi={selectedMmsi}
            livePosition={vessels.get(selectedMmsi) ?? null}
            onClose={() => setSelectedMmsi(null)}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}
