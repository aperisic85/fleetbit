// ── Detekcija rizika sudara — CPA/TCPA, indeks rizika (CRI), COLREG ──────────
//
// Sva geometrija radi u lokalnoj ravnini (equirectangular projekcija oko centra
// Kanala sv. Ante). Zona je mala (~1 nm) pa je ravninska aproksimacija točna na
// razini metara. Jedinice: pozicije/udaljenosti u metrima, brzine u m/s interno,
// a prema van DCPA u NM i TCPA u sekundama.
//
// Tri stupa nadzora:
//   1. Predviđanje putanje — projekcija pozicije iz trenutne brzine i kursa.
//   2. CRI (Collision Risk Index) — vremenski ovisan indeks rizika 0..1 iz
//      DCPA, TCPA i trenutne udaljenosti (uz opcionalni meteo faktor).
//   3. COLREG — klasifikacija susreta (pramac u pramac / presijecanje /
//      pretjecanje) i savjet tko ustupa put (COLREG pravila 13–15).

import type { VesselLive } from '../types';
import { CHANNEL_CENTER } from './channel';

const KN_TO_MS = 0.514444;
const M_PER_NM = 1852;
const DEG = Math.PI / 180;

// ── Konfigurabilni pragovi (env, s razumnim defaultima za uski kanal) ────────

/** DCPA ispod koje par ulazi u nadzor (upozorenje), u NM. */
export const CPA_WARN_NM = parseFloat(import.meta.env.VITE_CPA_WARN_NM ?? '0.15');
/** DCPA ispod koje je rizik kritičan (alarm), u NM. */
export const CPA_ALARM_NM = parseFloat(import.meta.env.VITE_CPA_ALARM_NM ?? '0.05');
/** Najveći TCPA koji se još uzima u obzir, u sekundama. */
export const TCPA_HORIZON_S = parseFloat(import.meta.env.VITE_TCPA_HORIZON_S ?? '600');
/** Horizont crtanja predviđene putanje, u sekundama. */
export const PREDICT_S = parseFloat(import.meta.env.VITE_PREDICT_S ?? '240');
/** Plovila sporija od ovoga (kn) tretiraju se kao stacionarna i preskaču. */
export const MIN_SPEED_KN = parseFloat(import.meta.env.VITE_COLLISION_MIN_SPEED_KN ?? '0.5');
/**
 * Najveća starost AIS očitanja (s) da bi plovilo ušlo u detekciju sudara.
 * AIS feed zna kasniti 2–5 min; u uskom Kanalu sv. Ante brod za 1 min prijeđe
 * znatan dio kanala, pa pozicija starija od ovoga više ne opisuje stvarno stanje
 * i CPA/TCPA postaju besmisleni. Takva plovila se izostavljaju iz računa (i
 * zasebno javljaju operateru). Konfigurabilno preko VITE_COLLISION_MAX_AGE_S.
 */
export const MAX_DATA_AGE_S = parseFloat(import.meta.env.VITE_COLLISION_MAX_AGE_S ?? '60');

// ── Projekcija ───────────────────────────────────────────────────────────────

const LAT0 = CHANNEL_CENTER[0];
const LON0 = CHANNEL_CENTER[1];
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = 111320 * Math.cos(LAT0 * DEG);

interface Vec { x: number; y: number } // x = istok, y = sjever (metri)

function toXY(lat: number, lon: number): Vec {
  return { x: (lon - LON0) * M_PER_DEG_LON, y: (lat - LAT0) * M_PER_DEG_LAT };
}

function toLatLon(p: Vec): [number, number] {
  return [LAT0 + p.y / M_PER_DEG_LAT, LON0 + p.x / M_PER_DEG_LON];
}

/** Vektor brzine (m/s) iz brzine nad dnom (kn) i kursa (° od sjevera, u smjeru kazaljke). */
function velocity(sogKn: number, courseDeg: number): Vec {
  const s = sogKn * KN_TO_MS;
  return { x: s * Math.sin(courseDeg * DEG), y: s * Math.cos(courseDeg * DEG) };
}

// ── Kinematika plovila ───────────────────────────────────────────────────────

export interface Kinematics {
  vessel: VesselLive;
  pos: Vec;      // dead-reckoning pozicija u trenutku `now` (ne sirovo očitanje)
  vel: Vec;
  course: number; // °
  speed: number;  // kn
  age: number;    // s — starost zadnjeg AIS očitanja u trenutku `now`
}

/** Starost AIS očitanja (s) u trenutku `nowMs`; 0 ako nema vremenske oznake. */
export function dataAge(v: VesselLive, nowMs: number): number {
  if (!v.last_seen) return 0;
  const t = new Date(v.last_seen).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (nowMs - t) / 1000);
}

/**
 * Izvuci kinematiku iz live pozicije; null ako nema dovoljno podataka.
 *
 * Pozicija se dead-reckoningom pomiče iz zadnjeg očitanja do `nowMs` po
 * prijavljenom vektoru brzine. Tako svi brodovi ulaze u CPA račun na istom
 * vremenu (inače bi se uspoređivale pozicije različite starosti) i djelomično se
 * kompenzira kašnjenje AIS feeda.
 */
export function kinematics(v: VesselLive, nowMs: number = Date.now()): Kinematics | null {
  if (v.lat == null || v.lon == null) return null;
  const course = v.cog ?? v.heading;
  if (course == null || course === 511) return null; // 511 = nedostupno (AIS)
  const speed = v.sog ?? 0;
  const age = dataAge(v, nowMs);
  const vel = velocity(speed, course);
  const raw = toXY(v.lat, v.lon);
  const pos = { x: raw.x + vel.x * age, y: raw.y + vel.y * age };
  return { vessel: v, pos, vel, course, speed, age };
}

/** Predviđena pozicija nakon `seconds` sekundi pravocrtnog gibanja. */
export function predict(k: Kinematics, seconds: number): [number, number] {
  return toLatLon({ x: k.pos.x + k.vel.x * seconds, y: k.pos.y + k.vel.y * seconds });
}

// ── CPA / TCPA ────────────────────────────────────────────────────────────────

interface Cpa { tcpa: number; dcpa: number; range: number } // s, NM, NM

function computeCpa(a: Kinematics, b: Kinematics): Cpa {
  const rx = a.pos.x - b.pos.x, ry = a.pos.y - b.pos.y; // relativna pozicija
  const vx = a.vel.x - b.vel.x, vy = a.vel.y - b.vel.y; // relativna brzina
  const vv = vx * vx + vy * vy;
  const range = Math.hypot(rx, ry);
  // TCPA = -(r·v)/(v·v); ako se ne približavaju, CPA je sada (tcpa=0).
  let tcpa = vv < 1e-6 ? 0 : -(rx * vx + ry * vy) / vv;
  if (tcpa < 0) tcpa = 0;
  const dx = rx + vx * tcpa, dy = ry + vy * tcpa;
  const dcpa = Math.hypot(dx, dy);
  return { tcpa, dcpa: dcpa / M_PER_NM, range: range / M_PER_NM };
}

// ── CRI — indeks rizika sudara (0..1) ────────────────────────────────────────

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Glatka pripadnost (kosinusna) — 1 ispod `lo`, 0 iznad `hi`. */
function membership(value: number, lo: number, hi: number): number {
  if (value <= lo) return 1;
  if (value >= hi) return 0;
  return 0.5 + 0.5 * Math.cos((Math.PI * (value - lo)) / (hi - lo));
}

/**
 * Težinski CRI iz DCPA, TCPA i trenutne udaljenosti.
 * `envFactor` (>=1) pojačava rizik u lošim hidrometeorološkim uvjetima
 * (smanjena vidljivost, valovi); 1.0 = normalno.
 */
function riskIndex(c: Cpa, envFactor: number): number {
  const uDcpa = membership(c.dcpa, CPA_ALARM_NM, CPA_WARN_NM * 2);
  const uTcpa = membership(c.tcpa, 60, TCPA_HORIZON_S);
  const uRange = membership(c.range, CPA_WARN_NM, 1.0);
  const base = 0.5 * uDcpa + 0.35 * uTcpa + 0.15 * uRange;
  return clamp01(base * envFactor);
}

// ── COLREG — klasifikacija susreta (pravila 13–15) ───────────────────────────

export type ColregType = 'head-on' | 'crossing' | 'overtaking' | 'unknown';

export interface ColregResult {
  type: ColregType;
  /** koje plovilo ustupa put: 'a', 'b', 'both' (pramac u pramac) ili null */
  giveWay: 'a' | 'b' | 'both' | null;
  /** kratki savjet (hrvatski) */
  advice: string;
}

/** Pravi azimut od → do (° od sjevera, u smjeru kazaljke). */
function bearing(from: Vec, to: Vec): number {
  return (Math.atan2(to.x - from.x, to.y - from.y) / DEG + 360) % 360;
}

/** Relativni azimut u rasponu -180..180; + = desni bok (starboard). */
function relativeBearing(courseDeg: number, brgDeg: number): number {
  return ((brgDeg - courseDeg + 540) % 360) - 180;
}

function label(v: VesselLive): string {
  return v.name?.trim() || `MMSI ${v.mmsi}`;
}

/**
 * Klasificiraj susret iz kinematike oba plovila i daj COLREG savjet.
 * relB = gdje A vidi B (relativno A-ovu kursu), relA = gdje B vidi A.
 */
function classifyColreg(a: Kinematics, b: Kinematics): ColregResult {
  const relB = relativeBearing(a.course, bearing(a.pos, b.pos));
  const relA = relativeBearing(b.course, bearing(b.pos, a.pos));
  const headingDiff = Math.abs(((a.course - b.course + 540) % 360) - 180);
  const nameA = label(a.vessel), nameB = label(b.vessel);

  // Pravilo 14 — pramac u pramac: svatko vidi drugoga blizu pramca, recipročni kursevi.
  if (Math.abs(relB) < 13 && Math.abs(relA) < 13 && headingDiff > 150) {
    return {
      type: 'head-on',
      giveWay: 'both',
      advice: `Pramac u pramac — oba plovila skreću udesno i prolaze lijevim bokovima.`,
    };
  }

  // Pravilo 13 — pretjecanje: jedan prilazi drugome s >22.5° iza njegova boka.
  // A pretječe B ako A dolazi iza B (|relA| > 112.5°) i brži je.
  if (Math.abs(relA) > 112.5 && a.speed > b.speed + 0.3) {
    return {
      type: 'overtaking',
      giveWay: 'a',
      advice: `${nameA} pretječe — drži se čistim i obilazi ${nameB}.`,
    };
  }
  if (Math.abs(relB) > 112.5 && b.speed > a.speed + 0.3) {
    return {
      type: 'overtaking',
      giveWay: 'b',
      advice: `${nameB} pretječe — drži se čistim i obilazi ${nameA}.`,
    };
  }

  // Pravilo 15 — presijecanje: ustupa onaj kojem je drugi s desnog boka.
  if (relB > 0 && relB < 112.5) {
    return {
      type: 'crossing',
      giveWay: 'a',
      advice: `${nameA} ustupa put — ${nameB} mu je s desne strane (pravo prolaza).`,
    };
  }
  if (relA > 0 && relA < 112.5) {
    return {
      type: 'crossing',
      giveWay: 'b',
      advice: `${nameB} ustupa put — ${nameA} mu je s desne strane (pravo prolaza).`,
    };
  }

  return { type: 'unknown', giveWay: null, advice: 'Pratiti — približavanje u nadzornoj zoni.' };
}

// ── Susret (par s rizikom) ────────────────────────────────────────────────────

export type RiskLevel = 'warning' | 'alarm';

export interface Encounter {
  id: string;            // stabilan ključ "minMmsi-maxMmsi"
  a: Kinematics;
  b: Kinematics;
  dcpa: number;          // NM
  tcpa: number;          // s
  range: number;         // NM (trenutna udaljenost)
  cri: number;           // 0..1
  age: number;           // s — starost najstarijeg od dvaju očitanja
  level: RiskLevel;
  colreg: ColregResult;
  cpaA: [number, number]; // predviđena pozicija A u trenutku CPA
  cpaB: [number, number]; // predviđena pozicija B u trenutku CPA
}

function pairId(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Izračunaj sve parove s rizikom sudara među zadanim plovilima.
 * `envFactor` (default 1) pojačava CRI u lošim uvjetima. Rezultat je sortiran
 * po CRI silazno.
 */
export function computeEncounters(vessels: VesselLive[], envFactor = 1, nowMs = Date.now()): Encounter[] {
  const ks: Kinematics[] = [];
  for (const v of vessels) {
    // Preskoči usidrena/privezana i (gotovo) stacionarna plovila.
    if (v.nav_status === 1 || v.nav_status === 5) continue;
    const k = kinematics(v, nowMs);
    if (!k || k.speed < MIN_SPEED_KN) continue;
    // Prestari podaci — pozicija više nije pouzdana za CPA/TCPA. Izostavi.
    if (k.age > MAX_DATA_AGE_S) continue;
    ks.push(k);
  }

  const out: Encounter[] = [];
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      const c = computeCpa(a, b);
      if (c.tcpa > TCPA_HORIZON_S) continue;
      if (c.dcpa > CPA_WARN_NM) continue;
      const cri = riskIndex(c, envFactor);
      if (cri <= 0) continue;
      const level: RiskLevel =
        c.dcpa <= CPA_ALARM_NM || cri >= 0.7 ? 'alarm' : 'warning';
      out.push({
        id: pairId(a.vessel.mmsi, b.vessel.mmsi),
        a, b,
        dcpa: c.dcpa,
        tcpa: c.tcpa,
        range: c.range,
        cri,
        age: Math.max(a.age, b.age),
        level,
        colreg: classifyColreg(a, b),
        cpaA: predict(a, c.tcpa),
        cpaB: predict(b, c.tcpa),
      });
    }
  }
  out.sort((x, y) => y.cri - x.cri);
  return out;
}

/**
 * Plovila koja se kreću kroz nadzornu zonu, ali su im AIS podaci prestari
 * (stariji od MAX_DATA_AGE_S) za pouzdanu detekciju sudara. Vraća se zasebno da
 * operater zna da je nadzor degradiran — brod je prisutan, ali izvan CPA računa.
 */
export function staleMovingVessels(
  vessels: VesselLive[],
  nowMs = Date.now(),
): { vessel: VesselLive; age: number }[] {
  const out: { vessel: VesselLive; age: number }[] = [];
  for (const v of vessels) {
    if (v.nav_status === 1 || v.nav_status === 5) continue;
    if (v.lat == null || v.lon == null) continue;
    if ((v.sog ?? 0) < MIN_SPEED_KN) continue;
    if (!v.last_seen) continue;
    const age = dataAge(v, nowMs);
    if (age > MAX_DATA_AGE_S) out.push({ vessel: v, age });
  }
  out.sort((a, b) => b.age - a.age);
  return out;
}

/** Pomoćno: ime plovila za prikaz. */
export function vesselName(v: VesselLive): string {
  return label(v);
}

/** Pomoćno: starost podataka kao "Xs" / "Ym" / "Zh". */
export function formatAge(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

/** Pomoćno: TCPA kao "m:ss". */
export function formatTcpa(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Pomoćno: DCPA u metrima ili NM, ovisno o veličini. */
export function formatDcpa(nm: number): string {
  const m = nm * M_PER_NM;
  return m < 1000 ? `${Math.round(m)} m` : `${nm.toFixed(2)} NM`;
}
