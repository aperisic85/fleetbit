// ────────────────────────────────────────────────────────────────────────
// AIS ship_type → čitljiva kategorija + boja.
// Centralizira logiku boje koja je prije bila inline u Sidebar/StatsWidget,
// pa je dijele i karta i paneli. Rasponi prate ITU-R M.1371 (AIS tip 5).
// ────────────────────────────────────────────────────────────────────────

export interface ShipClass {
  key: string;
  label: string;
  color: string;
}

const ACCENT = '#35e08d';

export const SHIP_CLASSES: Record<string, ShipClass> = {
  passenger: { key: 'passenger', label: 'Putnički',  color: '#38bdf8' },
  highspeed: { key: 'highspeed', label: 'Brzi (HSC)', color: '#a78bfa' },
  cargo:     { key: 'cargo',     label: 'Teretni',    color: '#fbbf24' },
  tanker:    { key: 'tanker',    label: 'Tanker',     color: '#f0664f' },
  fishing:   { key: 'fishing',   label: 'Ribarski',   color: '#fb923c' },
  pleasure:  { key: 'pleasure',  label: 'Jahta / jedrenjak', color: '#2dd4bf' },
  service:   { key: 'service',   label: 'Servisni / tegljač', color: '#8aa0b2' },
  other:     { key: 'other',     label: 'Ostalo',     color: '#64748b' },
};

/** Klasificira AIS ship_type u jednu od SHIP_CLASSES. */
export function shipClass(shipType: number | null | undefined): ShipClass {
  const t = shipType ?? 0;
  if (t >= 60 && t <= 69) return SHIP_CLASSES.passenger;
  if (t >= 40 && t <= 49) return SHIP_CLASSES.highspeed;
  if (t >= 70 && t <= 79) return SHIP_CLASSES.cargo;
  if (t >= 80 && t <= 89) return SHIP_CLASSES.tanker;
  if (t === 30)           return SHIP_CLASSES.fishing;
  if (t >= 36 && t <= 37) return SHIP_CLASSES.pleasure;
  if (t >= 31 && t <= 35) return SHIP_CLASSES.service;
  if (t >= 50 && t <= 59) return SHIP_CLASSES.service;
  return SHIP_CLASSES.other;
}

/** Boja markera/retka uz poštivanje nav_status (usidreno/privezano = neutralno). */
export function vesselColor(shipType: number | null | undefined, navStatus: number | null | undefined): string {
  if (navStatus === 1 || navStatus === 5) return '#8aa0b2';
  return shipClass(shipType).color;
}

export const ACCENT_GREEN = ACCENT;
