import { useCallback, useEffect, useRef, useState } from 'react';
import type { VesselLive } from './types';
import { fetchLiveVessels, liveWsUrl } from './api';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

// ── Filtriranje pogrešnih AIS pozicija ───────────────────────────────────────
// AIS feed povremeno donese pogrešnu poziciju (multipath, MMSI kolizija dvaju
// odašiljača, greška dekodiranja). Bez filtra ikona "preleti" pola karte pa se
// sljedećim ispravnim očitanjem vrati — i tako stalno. Ove provjere odbacuju
// nemoguće skokove i nevažeće koordinate.

// Najveća uvjerljiva brzina broda (čvorovi). Pomak koji bi tražio veću brzinu
// znači da je nova pozicija šum, ne stvarno kretanje.
const MAX_PLAUSIBLE_SPEED_KN = 120;
// Ispod ovog pomaka ne provjeravamo brzinu (sitni jitter na vezu/sidru).
const MIN_JUMP_NM = 0.5;

/** Jesu li koordinate valjane (raspon + nije "Null Island" 0,0). */
export function isValidLatLon(
  lat: number | null | undefined,
  lon: number | null | undefined,
): lat is number {
  if (lat == null || lon == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  // (0,0) je gotovo uvijek greška dekodiranja, ne stvarna pozicija.
  if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) return false;
  return true;
}

/** Udaljenost u nautičkim miljama (haversine). */
function distanceNm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 3440.065; // radijus Zemlje u NM
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Je li nova pozicija fizički nemoguća s obzirom na prethodnu (predaleko za
 * proteklo vrijeme)? Ako da — riječ je o pogrešnom očitanju i treba ga odbaciti.
 */
function isTeleport(prev: VesselLive, lat: number, lon: number, newTimeMs: number): boolean {
  if (prev.lat == null || prev.lon == null || prev.last_seen == null) return false;
  const prevMs = new Date(prev.last_seen).getTime();
  const dtSec = (newTimeMs - prevMs) / 1000;
  if (!Number.isFinite(dtSec) || dtSec <= 0) return false; // staro/istovremeno — ne sudimo po brzini
  const distNm = distanceNm(prev.lat, prev.lon, lat, lon);
  if (distNm < MIN_JUMP_NM) return false;
  const speedKn = distNm / (dtSec / 3600);
  return speedKn > MAX_PLAUSIBLE_SPEED_KN;
}

/** Spaja jednu 'update' poruku u mapu brodova uz validaciju pozicije. */
function applyUpdate(
  prev: Map<number, VesselLive>,
  position: VesselLive & { time?: string },
): Map<number, VesselLive> {
  const mmsi = position.mmsi;
  const existing = prev.get(mmsi);
  const newTimeMs = position.time
    ? new Date(position.time).getTime()
    : position.last_seen
    ? new Date(position.last_seen).getTime()
    : Date.now();

  if (isValidLatLon(position.lat, position.lon)) {
    // Odbaci nemoguć skok pozicije — zadrži postojeću (ispravnu) lokaciju.
    if (existing && isTeleport(existing, position.lat, position.lon!, newTimeMs)) {
      return prev;
    }
  } else {
    // Nevažeća pozicija: ne pomiči brod (zadrži staru ako postoji).
    return prev;
  }

  const merged: VesselLive = {
    ...existing,
    ...position,
    last_seen: position.time ?? position.last_seen ?? existing?.last_seen ?? null,
  };
  return new Map(prev).set(mmsi, merged);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const HEARTBEAT_MS = 20_000; // pošalji "ping" svakih 20s
const STALE_MS = 35_000;     // bez ijedne poruke 35s → veza je mrtva, reconnect
const RECONNECT_MS = 3_000;

/**
 * Drži živu mapu brodova (REST snapshot + WebSocket update-ovi) i brine se da
 * podaci ostanu svježi: heartbeat detektira mrtve veze, a povratak taba u fokus
 * ili mreže pokreće ponovni dohvat. Time se rješava nestajanje brodova nakon
 * dužeg vremena. Pozicije se filtriraju da se uklone "leteći" brodovi.
 */
export function useLiveVessels(): {
  vessels: Map<number, VesselLive>;
  wsStatus: WsStatus;
  loading: boolean;
} {
  const [vessels, setVessels] = useState<Map<number, VesselLive>>(new Map());
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const lastActivityRef = useRef<number>(0); // postavlja se pri spajanju
  const reconnectTimerRef = useRef<number | null>(null);

  const refetch = useCallback(() => {
    return fetchLiveVessels()
      .then((data) => {
        setVessels((prev) => {
          const map = new Map(prev);
          for (const v of (data.vessels ?? []) as VesselLive[]) map.set(v.mmsi, v);
          return map;
        });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let disposed = false;

    function scheduleReconnect() {
      if (disposed || reconnectTimerRef.current != null) return;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        // Mreža je možda bila prekinuta — osvježi i REST snapshot.
        void refetch();
        connect();
      }, RECONNECT_MS);
    }

    function connect() {
      if (disposed) return;
      setWsStatus('connecting');
      const ws = new WebSocket(liveWsUrl());
      wsRef.current = ws;
      lastActivityRef.current = Date.now();

      ws.onopen = () => {
        if (disposed) return;
        lastActivityRef.current = Date.now();
        setWsStatus('connected');
      };

      ws.onmessage = (e) => {
        lastActivityRef.current = Date.now();
        let msg: { type?: string; vessels?: VesselLive[]; position?: VesselLive & { time?: string } };
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === 'pong') return; // odgovor na heartbeat
        if (msg.type === 'snapshot' && Array.isArray(msg.vessels)) {
          setVessels((prev) => {
            const map = new Map(prev);
            for (const v of msg.vessels!) map.set(v.mmsi, v);
            return map;
          });
        } else if (msg.type === 'update' && msg.position?.mmsi != null) {
          setVessels((prev) => applyUpdate(prev, msg.position!));
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsStatus('disconnected');
        scheduleReconnect();
      };
      ws.onerror = () => ws.close();
    }

    function forceReconnect() {
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(); } catch { /* ignore */ } // onclose → scheduleReconnect
      } else {
        scheduleReconnect();
      }
    }

    // Heartbeat: drži vezu toplom i otkrij mrtve (zombi) konekcije.
    const heartbeat = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastActivityRef.current > STALE_MS) {
        try { ws.close(); } catch { /* ignore */ } // pokreće reconnect
        return;
      }
      try { ws.send('ping'); } catch { /* ignore */ }
    }, HEARTBEAT_MS);

    // Povratak taba u fokus / mreže — odmah osvježi i provjeri vezu.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refetch();
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        scheduleReconnect();
      } else if (Date.now() - lastActivityRef.current > STALE_MS) {
        forceReconnect();
      }
    };
    const onOnline = () => { void refetch(); forceReconnect(); };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    refetch().finally(() => { if (!disposed) setLoading(false); });
    connect();

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onclose = null; // spriječi reconnect nakon unmounta
        try { ws.close(); } catch { /* ignore */ }
      }
    };
  }, [refetch]);

  return { vessels, wsStatus, loading };
}
