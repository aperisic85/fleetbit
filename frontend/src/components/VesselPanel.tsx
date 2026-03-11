import { useEffect, useState } from 'react';
import type { Vessel, VesselLive, TrackPoint } from '../types';
import { fetchVessel, fetchTrack } from '../api';

interface Props {
  mmsi: number;
  livePosition: VesselLive | null;
  onClose: () => void;
  isMobile?: boolean;
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );
}

function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return '—';
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const timeStr = date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (diffSec < 60) return `${timeStr} (${diffSec}s nazad)`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${timeStr} (${diffMin} min nazad)`;
  const diffH = Math.floor(diffMin / 60);
  return `${timeStr} (${diffH}h nazad)`;
}

export function VesselPanel({ mmsi, livePosition, onClose, isMobile }: Props) {
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVessel(mmsi), fetchTrack(mmsi, undefined, undefined, 500)])
      .then(([det, trk]) => {
        setVessel(det.vessel);
        setTrack(trk.track ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mmsi]);

  const live = livePosition;

  const mobileStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderRadius: '12px 12px 0 0',
    maxHeight: '55vh',
    overflowY: 'auto',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  };

  const desktopStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 280,
  };

  return (
    <div style={{
      ...(isMobile ? mobileStyle : desktopStyle),
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      zIndex: 1000,
      overflow: isMobile ? 'auto' : 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-base)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: isMobile ? 'sticky' : 'static',
        top: 0,
        zIndex: 1,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {vessel?.name ?? live?.name ?? `MMSI ${mmsi}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MMSI: {mmsi}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
        >×</button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Učitavanje...</div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa', marginBottom: 6, textTransform: 'uppercase' }}>
              Podaci o plovilu
            </div>
            <Row label="IMO" value={vessel?.imo} />
            <Row label="Callsign" value={vessel?.callsign} />
            <Row label="Tip plovila" value={vessel?.ship_type} />
            <Row label="Duljina" value={vessel?.length ? `${vessel.length} m` : null} />
            <Row label="Širina" value={vessel?.width ? `${vessel.width} m` : null} />
            <Row label="Gaz" value={vessel?.draught ? `${vessel.draught} m` : null} />
            <Row label="Odredište" value={vessel?.destination} />

            {live && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' }}>
                  Trenutna pozicija
                </div>
                <Row label="Lat" value={live.lat?.toFixed(5)} />
                <Row label="Lon" value={live.lon?.toFixed(5)} />
                <Row label="SOG" value={live.sog != null ? `${live.sog.toFixed(1)} kn` : null} />
                <Row label="COG" value={live.cog != null ? `${live.cog.toFixed(0)}°` : null} />
                <Row label="Heading" value={live.heading != null ? `${live.heading}°` : null} />
                <Row label="Zadnja AIS poruka" value={formatLastSeen(live.last_seen)} />
              </>
            )}

            <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' }}>
              Ruta (zadnjih 24h)
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {track.length} točaka rute zabilježeno
            </div>
          </>
        )}
      </div>
    </div>
  );
}
