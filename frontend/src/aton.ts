import type { AtonLive } from './types';

// IALA A-126 §4.6.4 — Page 7 (bits 7-5 = 111):
//   bit 0:    alarm (0=OK, 1=Alarm)
//   bits 2-1: light_status (2 bita)
//   bits 4-3: racon_status (2 bita)

export const LIGHT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nije praćeno', color: '#64748b' },
  1: { label: 'Upaljeno',     color: '#f59e0b' },
  2: { label: 'Ugašeno',      color: '#94a3b8' },
  3: { label: 'Greška',       color: '#f97316' },
};

export const RACON_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nije instaliran', color: '#64748b' },
  1: { label: 'Nije praćen',     color: '#f59e0b' },
  2: { label: 'Operativan',      color: '#22c55e' },
  3: { label: 'Greška',          color: '#ef4444' },
};

// Ukupna ocjena statusa AtoNa
export type AtonHealth = 'ok' | 'warning' | 'alarm' | 'unknown';

export function atonHealth(a: AtonLive): AtonHealth {
  if (a.alarm === null && a.light_status === null && a.racon_status === null) return 'unknown';
  if (a.alarm) return 'alarm';
  if (a.off_position) return 'alarm';
  const lightError = a.light_status != null && a.light_status === 3;
  const raconFault = a.racon_status != null && a.racon_status === 3;
  if (lightError || raconFault) return 'warning';
  const raconUnmonitored = a.racon_status === 1;
  if (raconUnmonitored) return 'warning';
  return 'ok';
}

export const HEALTH_COLOR: Record<AtonHealth, string> = {
  ok:      '#22c55e',
  warning: '#f59e0b',
  alarm:   '#ef4444',
  unknown: '#64748b',
};

export const AID_TYPE_LABEL: Record<number, string> = {
  1:  'Referentna točka',
  2:  'RACON',
  3:  'Fiksna struktura',
  4:  'Rezervirano',
  5:  'Svjetlo bez sektora',
  6:  'Svjetlo sa sektorima',
  7:  'Vodeće svjetlo (prednje)',
  8:  'Vodeće svjetlo (stražnje)',
  9:  'Kardinalni plovak S',
  10: 'Kardinalni plovak I',
  11: 'Kardinalni plovak J',
  12: 'Kardinalni plovak Z',
  13: 'Plovak lijevog boka',
  14: 'Plovak desnog boka',
  15: 'Plovak prednostnog kanala L',
  16: 'Plovak prednostnog kanala D',
  17: 'Plovak izolirane opasnosti',
  18: 'Plovak sigurne vode',
  19: 'Specijalni plovak',
  20: 'Kardinalni marker S',
  21: 'Kardinalni marker I',
  22: 'Kardinalni marker J',
  23: 'Kardinalni marker Z',
  24: 'Marker lijevog boka',
  25: 'Marker desnog boka',
  26: 'Marker prednostnog kanala L',
  27: 'Marker prednostnog kanala D',
  28: 'Marker izolirane opasnosti',
  29: 'Marker sigurne vode',
  30: 'Specijalni marker',
  31: 'Svjetlosni brod / LANBY',
};

export function aidTypeLabel(t: number | null): string {
  if (t == null) return 'Nepoznato';
  return AID_TYPE_LABEL[t] ?? `Tip ${t}`;
}
