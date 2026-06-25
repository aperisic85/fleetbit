import { useEffect, useMemo, useRef, useState } from 'react';
import type { VesselLive } from '../types';
import { SPEED_LIMIT_KN, channelDirection, isInChannel, type ChannelDirection } from './channel';
import { beep } from './sound';

export interface ChannelVessel {
  vessel: VesselLive;
  speeding: boolean;
  direction: ChannelDirection;
}

/** Razina stanja kanala — redoslijed po ozbiljnosti */
export type ChannelLevel = 'clear' | 'active' | 'meeting' | 'speeding';

export interface ChannelEvent {
  id: number;
  time: Date;
  text: string;
  type: 'info' | 'warning' | 'alarm';
}

export interface ChannelWatch {
  channelVessels: ChannelVessel[];
  level: ChannelLevel;
  meeting: boolean;
  speedingVessels: ChannelVessel[];
  events: ChannelEvent[];
}

let eventId = 1;

function vesselLabel(v: VesselLive): string {
  return v.name?.trim() || `MMSI ${v.mmsi}`;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Prati plovila unutar Kanala sv. Ante:
 *  - upozorenje kad su 2+ plovila istovremeno u kanalu (susret)
 *  - alarm kad plovilo prekorači ograničenje brzine (SPEED_LIMIT_KN)
 *  - dnevnik ulazaka/izlazaka i prekršaja
 */
export function useChannelWatch(vessels: VesselLive[], soundOn: boolean): ChannelWatch {
  const channelVessels = useMemo<ChannelVessel[]>(
    () => vessels
      .filter((v) => v.lat != null && v.lon != null && isInChannel(v.lat, v.lon))
      .map((v) => ({
        vessel: v,
        speeding: (v.sog ?? 0) > SPEED_LIMIT_KN,
        direction: channelDirection(v.cog ?? v.heading),
      })),
    [vessels]
  );

  const speedingVessels = useMemo(
    () => channelVessels.filter((c) => c.speeding),
    [channelVessels]
  );
  const meeting = channelVessels.length >= 2;
  const level: ChannelLevel = speedingVessels.length > 0
    ? 'speeding'
    : meeting
    ? 'meeting'
    : channelVessels.length > 0
    ? 'active'
    : 'clear';

  const [events, setEvents] = useState<ChannelEvent[]>([]);
  const prevInside = useRef<Map<number, VesselLive>>(new Map());
  const prevSpeeding = useRef<Set<number>>(new Set());
  const prevMeeting = useRef(false);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const inside = new Map(channelVessels.map((c) => [c.vessel.mmsi, c.vessel]));
    const speeding = new Set(speedingVessels.map((c) => c.vessel.mmsi));
    const fresh: ChannelEvent[] = [];
    const push = (text: string, type: ChannelEvent['type']) =>
      fresh.push({ id: eventId++, time: new Date(), text, type });

    for (const [mmsi, v] of inside) {
      if (!prevInside.current.has(mmsi)) {
        const dir = channelDirection(v.cog ?? v.heading);
        const dirText = dir === 'inbound' ? 'uplovljava' : dir === 'outbound' ? 'isplovljava' : 'u kanalu';
        push(`${vesselLabel(v)} ušao u kanal (${dirText})`, 'info');
      }
    }
    for (const [mmsi, v] of prevInside.current) {
      if (!inside.has(mmsi)) push(`${vesselLabel(v)} izašao iz kanala`, 'info');
    }

    let playWarning = false;
    let playAlarm = false;

    if (meeting && !prevMeeting.current) {
      push(`UPOZORENJE: ${inside.size} plovila istovremeno u kanalu`, 'warning');
      playWarning = true;
    }

    for (const c of speedingVessels) {
      if (!prevSpeeding.current.has(c.vessel.mmsi)) {
        push(
          `ALARM: ${vesselLabel(c.vessel)} plovi ${(c.vessel.sog ?? 0).toFixed(1)} kn (limit ${SPEED_LIMIT_KN} kn)`,
          'alarm'
        );
        playAlarm = true;
      }
    }

    prevInside.current = inside;
    prevSpeeding.current = speeding;
    prevMeeting.current = meeting;

    if (fresh.length > 0) {
      setEvents((prev) => [...fresh.reverse(), ...prev].slice(0, 80));
    }
    if (soundRef.current) {
      if (playAlarm) beep('alarm');
      else if (playWarning) beep('warning');
    }
  }, [channelVessels, speedingVessels, meeting]);

  return { channelVessels, level, meeting, speedingVessels, events };
}
