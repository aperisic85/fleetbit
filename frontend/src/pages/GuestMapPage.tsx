import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { VesselLive } from '../types';
import { fetchLiveVessels, createWebSocket } from '../api';
import { LiveMap } from '../components/LiveMap';
import { StatsWidget } from '../components/StatsWidget';

/**
 * Gostujuća live karta — brodovi su vidljivi ali bez detalja.
 * Klikanje na brod preusmjerava na prijavu.
 */
export default function GuestMapPage() {
  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

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

  const handleSelect = useCallback(() => {
    // Gosti ne mogu vidjeti detalje — prijava je potrebna
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
          setVessels((prev) => new Map(prev).set(pos.mmsi, { ...prev.get(pos.mmsi), ...pos }));
        }
      });
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const vesselList = useMemo(
    () => Array.from(vessels.values()).filter((v) => v.lat != null && v.lon != null),
    [vessels]
  );

  const mapVessels = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return vesselList.filter(v => v.last_seen != null && new Date(v.last_seen).getTime() >= cutoff);
  }, [vesselList]);

  const wsCfg = wsStatus === 'connected'
    ? { color: '#34d399', bg: '#34d39918', border: '#34d39940', label: 'Live', pulse: true }
    : wsStatus === 'connecting'
    ? { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b40', label: 'Spajanje...', pulse: true }
    : { color: '#f87171', bg: '#f8717118', border: '#f8717140', label: 'Offline', pulse: false };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Gornja traka */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(15,23,42,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1001,
        flexShrink: 0,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚓</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>
            Fleet<span style={{ color: '#38bdf8' }}>bit</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 6,
            padding: '4px 10px',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 500,
          }}>
            Gostujući pregled
          </span>
          <Link to="/login" style={{
            background: '#0ea5e9',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 13,
            padding: '7px 16px',
            borderRadius: 7,
            fontWeight: 600,
          }}>
            Prijavi se za detalje
          </Link>
        </div>
      </div>

      {/* Karta */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            zIndex: 10,
            color: '#94a3b8',
            fontSize: 15,
          }}>
            Učitavanje brodova...
          </div>
        )}

        <LiveMap
          vessels={mapVessels}
          selectedMmsi={null}
          track={[]}
          onSelect={handleSelect}
        />

        <StatsWidget vessels={vesselList} />

        {/* WS badge */}
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
        }}>
          <span style={{
            display: 'inline-block',
            width: 7, height: 7,
            borderRadius: '50%',
            background: wsCfg.color,
            flexShrink: 0,
            animation: wsCfg.pulse ? 'wsPulse 1.4s ease-in-out infinite' : 'none',
          }} />
          {wsCfg.label}
        </div>

        {/* Overlay poruka za goste */}
        <div style={{
          position: 'absolute',
          bottom: 52,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: 13,
          color: '#94a3b8',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
        }}>
          Za detalje o brodu{' '}
          <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            prijavite se
          </Link>
          {' '}ili{' '}
          <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            registrirajte kompaniju
          </Link>
        </div>
      </div>
    </div>
  );
}
