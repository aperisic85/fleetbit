import type { AtonLive } from './types';

// Bit 0: alarm
// Bits 1-3: light_status
// Bits 4-5: racon_status

export const LIGHT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nije praćeno', color: '#64748b' },
  1: { label: 'Upaljeno',     color: '#22c55e' },
  2: { label: 'Ugašeno',      color: '#ef4444' },
  3: { label: 'Smanjeno',     color: '#f59e0b' },
  4: { label: 'Rezervirano',  color: '#64748b' },
  5: { label: 'Rezervirano',  color: '#64748b' },
  6: { label: 'Rezervirano',  color: '#64748b' },
  7: { label: 'Rezervirano',  color: '#64748b' },
};

export const RACON_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nije praćeno', color: '#64748b' },
  1: { label: 'Aktivan',      color: '#22c55e' },
  2: { label: 'Kvar',         color: '#ef4444' },
  3: { label: 'Rezervirano',  color: '#64748b' },
};

// Ukupna ocjena statusa AtoNa
export type AtonHealth = 'ok' | 'warning' | 'alarm' | 'unknown';

export function atonHealth(a: AtonLive): AtonHealth {
  if (a.alarm === null && a.light_status === null && a.racon_status === null) return 'unknown';
  if (a.alarm) return 'alarm';
  if (a.off_position) return 'alarm';
  const lightFault = a.light_status != null && a.light_status === 2;
  const raconFault = a.racon_status != null && a.racon_status === 2;
  if (lightFault || raconFault) return 'alarm';
  const lightReduced = a.light_status === 3;
  if (lightReduced) return 'warning';
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
