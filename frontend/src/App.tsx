import { useEffect, useRef, useState } from 'react';
import type { VesselLive, TrackPoint } from './types';
import { fetchLiveVessels, fetchTrack, createWebSocket } from './api';
import { Sidebar } from './components/Sidebar';
import { LiveMap } from './components/LiveMap';
import { VesselPanel } from './components/VesselPanel';

export default function App() {
  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

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

  const vesselList = Array.from(vessels.values()).filter((v) => v.lat != null && v.lon != null);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar
        vessels={vesselList}
        selectedMmsi={selectedMmsi}
        onSelect={setSelectedMmsi}
      />

      <div style={{ flex: 1, position: 'relative' }}>
        <LiveMap
          vessels={vesselList}
          selectedMmsi={selectedMmsi}
          track={track}
          onSelect={setSelectedMmsi}
        />

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
          />
        )}
      </div>
    </div>
  );
}
