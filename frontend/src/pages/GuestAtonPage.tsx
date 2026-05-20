import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { AtonLive } from '../types';
import { fetchLiveAtons } from '../api';
import { AtonMarker } from '../components/AtonMarker';
import { useTheme } from '../ThemeContext';

export default function GuestAtonPage() {
  const [atons, setAtons] = useState<AtonLive[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    fetchLiveAtons()
      .then((data) => setAtons(data.atons ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const mapAtons = useMemo(() => atons.filter(a => a.lat != null && a.lon != null), [atons]);

  const alarmCount = useMemo(() => atons.filter(a => a.alarm).length, [atons]);

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

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
            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>AIS Aton</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {alarmCount > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 6,
              padding: '4px 10px',
              color: '#f87171',
              fontSize: 12,
              fontWeight: 600,
            }}>
              ⚠ {alarmCount} alarm{alarmCount !== 1 ? 'a' : ''}
            </span>
          )}
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
            Učitavanje AtoN oznaka...
          </div>
        )}

        <MapContainer
          center={[44.5, 15.0]}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={tileUrl} attribution="© CartoDB" />
          <ZoomControl position="bottomright" />
          {mapAtons.map(a => (
            <AtonMarker
              key={a.mmsi}
              aton={a}
              selected={false}
              onClick={() => {/* detalji zahtijevaju prijavu */}}
            />
          ))}
        </MapContainer>

        {/* Broj AtoN-ova */}
        {!loading && (
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#94a3b8',
            backdropFilter: 'blur(4px)',
          }}>
            {mapAtons.length} AtoN oznaka
          </div>
        )}

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
          Za detalje o oznaci{' '}
          <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            prijavite se
          </Link>
          {' '}ili{' '}
          <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            registrirajte se
          </Link>
        </div>
      </div>
    </div>
  );
}
