import { useEffect, useMemo, useRef, useState } from 'react';
import type { VesselLive } from '../types';
import { beep } from './sound';
import {
  computeEncounters,
  formatAge,
  formatDcpa,
  formatTcpa,
  staleMovingVessels,
  vesselName,
  type Encounter,
} from './collision';
import type { ChannelEvent } from './useChannelWatch';

export type CollisionLevel = 'clear' | 'warning' | 'alarm';

export interface StaleVessel {
  vessel: VesselLive;
  age: number; // s
}

export interface CollisionWatch {
  encounters: Encounter[];
  /** MMSI svih plovila uključenih u barem jedan rizični par */
  atRiskMmsi: Set<number>;
  /** Plovila u pokretu sa zastarjelim AIS podacima (izvan CPA računa) */
  staleVessels: StaleVessel[];
  level: CollisionLevel;
  events: ChannelEvent[];
}

// Dead-reckoning pozicije i TCPA moraju ostati ažurni i kad AIS feed šuti, pa
// modul sam okida ponovni izračun na ovom intervalu (ms).
const TICK_MS = 5_000;

// Vlastiti id-prostor da se ne sudara s ključevima iz useChannelWatch.
let collisionEventId = 1_000_000_000;

const EMPTY: CollisionWatch = {
  encounters: [],
  atRiskMmsi: new Set(),
  staleVessels: [],
  level: 'clear',
  events: [],
};

/**
 * Detekcija rizika sudara nad live flotom:
 *  - računa CPA/TCPA i CRI za sve parove u nadzornoj zoni
 *  - klasificira susret po COLREG-u i daje savjet o ustupanju puta
 *  - bilježi događaje i oglašava alarm kad se pojavi novi rizik
 *
 * `enabled=false` posve gasi modul (prazan rezultat, bez računanja/zvuka).
 * `envFactor` (>=1) pojačava CRI u lošim hidrometeo uvjetima.
 */
export function useCollisionWatch(
  vessels: VesselLive[],
  soundOn: boolean,
  enabled: boolean,
  envFactor = 1,
): CollisionWatch {
  // Samostalni sat: drži dead-reckoning i TCPA svježima i bez novih AIS poruka.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  const encounters = useMemo(
    () => (enabled ? computeEncounters(vessels, envFactor, nowMs) : []),
    [vessels, enabled, envFactor, nowMs],
  );

  const staleVessels = useMemo<StaleVessel[]>(
    () => (enabled ? staleMovingVessels(vessels, nowMs) : []),
    [vessels, enabled, nowMs],
  );

  const atRiskMmsi = useMemo(() => {
    const s = new Set<number>();
    for (const e of encounters) {
      s.add(e.a.vessel.mmsi);
      s.add(e.b.vessel.mmsi);
    }
    return s;
  }, [encounters]);

  const level: CollisionLevel = encounters.some((e) => e.level === 'alarm')
    ? 'alarm'
    : encounters.length > 0
    ? 'warning'
    : 'clear';

  const [events, setEvents] = useState<ChannelEvent[]>([]);
  // Pamti zadnju zabilježenu razinu po paru da ne spamamo dnevnik.
  const prevLevel = useRef<Map<string, 'warning' | 'alarm'>>(new Map());
  // Pamti koja su plovila već prijavljena kao zastarjela (jednom po ulasku).
  const prevStale = useRef<Set<number>>(new Set());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const fresh: ChannelEvent[] = [];
    const push = (text: string, type: ChannelEvent['type']) =>
      fresh.push({ id: collisionEventId++, time: new Date(), text, type });

    const current = new Map<string, 'warning' | 'alarm'>();
    let playAlarm = false;
    let playWarning = false;

    for (const e of encounters) {
      current.set(e.id, e.level);
      const prev = prevLevel.current.get(e.id);
      const nameA = vesselName(e.a.vessel);
      const nameB = vesselName(e.b.vessel);
      const detail = `CPA ${formatDcpa(e.dcpa)} za ${formatTcpa(e.tcpa)}`;

      // Novi par, ili eskalacija upozorenje → alarm.
      if (prev == null) {
        if (e.level === 'alarm') {
          push(`RIZIK SUDARA: ${nameA} ⇄ ${nameB} — ${detail}. ${e.colreg.advice}`, 'alarm');
          playAlarm = true;
        } else {
          push(`Približavanje: ${nameA} ⇄ ${nameB} — ${detail}.`, 'warning');
          playWarning = true;
        }
      } else if (prev === 'warning' && e.level === 'alarm') {
        push(`RIZIK SUDARA: ${nameA} ⇄ ${nameB} — ${detail}. ${e.colreg.advice}`, 'alarm');
        playAlarm = true;
      }
    }

    // Razriješeni parovi (više nisu rizik).
    for (const [id] of prevLevel.current) {
      if (!current.has(id)) {
        const [m1, m2] = id.split('-');
        push(`Rizik razriješen: MMSI ${m1} ⇄ ${m2}.`, 'info');
      }
    }

    prevLevel.current = current;

    if (fresh.length > 0) {
      setEvents((prev) => [...fresh.reverse(), ...prev].slice(0, 80));
    }
    if (soundRef.current) {
      if (playAlarm) beep('collision');
      else if (playWarning) beep('warning');
    }
  }, [encounters]);

  // Javi (jednom) kad plovilo u pokretu ispadne iz nadzora zbog zastarjelih
  // podataka — operater mora znati da je za njega detekcija sudara degradirana.
  useEffect(() => {
    if (!enabled) return;
    const current = new Set(staleVessels.map((s) => s.vessel.mmsi));
    const fresh: ChannelEvent[] = [];
    for (const s of staleVessels) {
      if (!prevStale.current.has(s.vessel.mmsi)) {
        fresh.push({
          id: collisionEventId++,
          time: new Date(),
          text: `Podaci za ${vesselName(s.vessel)} zastarjeli (${formatAge(s.age)}) — izvan detekcije sudara`,
          type: 'warning',
        });
      }
    }
    prevStale.current = current;
    if (fresh.length > 0) {
      setEvents((prev) => [...fresh.reverse(), ...prev].slice(0, 80));
    }
  }, [staleVessels, enabled]);

  if (!enabled) return EMPTY;
  return { encounters, atRiskMmsi, staleVessels, level, events };
}
