// ── Kanal sv. Ante (Šibenik) — geometrija i pravila nadzora ─────────────────
//
// Obris kanala je usidren na stvarnim orijentirima:
//  - južni ulaz: svjetionik Jadrija (43.7216, 15.8502) — tvrđava sv. Nikole (43.7214, 15.8547)
//  - sjeverni izlaz: rt Martinska (~43.732, 15.877)
// JI/I (istočna) obala je usidrena na izmjerenim točkama (izlaz → ulaz);
// Z/SZ obala (Jadrija → izlaz) je još aproksimacija. Po potrebi je fino
// podesi; sva logika čita samo ovaj popis.

/**
 * Ograničenje brzine u kanalu (čvorovi).
 * Konfigurabilno preko VITE_SPEED_LIMIT_KN; default 10 kn.
 */
export const SPEED_LIMIT_KN = parseFloat(
  import.meta.env.VITE_SPEED_LIMIT_KN ?? '10',
);

/** Približni prosječni smjer osi kanala ulaz → Martinska (stupnjevi) */
export const CHANNEL_AXIS_DEG = 58;

/** Centar kanala — početni fokus karte */
export const CHANNEL_CENTER: [number, number] = [43.7265, 15.8665];
export const CHANNEL_ZOOM = 15;

/**
 * Polumjer nadzorne zone oko centra kanala (NM). Plovila izvan zone se ne
 * prate — ni na karti, ni u alarmima/detekciji sudara. Nadzire se samo Kanal
 * sv. Ante (uz uske prilaze), a ne cijeli Jadran. Konfigurabilno preko
 * VITE_MONITOR_RADIUS_NM; default 1.5 NM (pokriva kanal + prilaze).
 */
export const MONITOR_RADIUS_NM = parseFloat(import.meta.env.VITE_MONITOR_RADIUS_NM ?? '1.5');

/**
 * Obris kanala: prvo zapadna/sjeverozapadna obala od svjetionika Jadrija
 * (južni ulaz) do izlaza, zatim jugoistočna obala od rta Martinska natrag
 * do tvrđave sv. Nikole. Južna stranica poligona = ulazna linija
 * Jadrija—sv. Nikola, sjeveroistočna stranica = izlazna linija kod Martinske.
 */
export const CHANNEL_POLYGON: [number, number][] = [
  // Z/SZ obala — od svjetionika Jadrija (južni ulaz) prema izlazu
  [43.7218, 15.8504], // svjetionik Jadrija
  [43.7245, 15.8528],
  [43.7270, 15.8568],
  [43.7292, 15.8615],
  [43.7310, 15.8668],
  [43.7325, 15.8720],
  [43.7336, 15.8766], // sjeverni rub izlaza (šibenska strana)
  // JI/I (istočna) obala — izmjerene točke od izlaza prema ulazu
  // (lijeva strana pri isplovljavanju iz Šibenika)
  [43.728466, 15.881275],                   // izlaz, istočna točka
  [43.726546063868334, 15.878468606361217],
  [43.7271092831762, 15.874377627949121],
  [43.72674725772394, 15.870704072513734],
  [43.72489685730577, 15.866418472062692],
  [43.72435357628185, 15.862689438653364],
  [43.72403141718479, 15.859127352065451],
  [43.71868224453116, 15.857736652433239],
  [43.7158060187554, 15.855510973029963],   // ulaz, nasuprot svjetionika Jadrija
];

/** Ray-casting test: nalazi li se točka unutar poligona kanala */
export function isInChannel(lat: number, lon: number): boolean {
  const poly = CHANNEL_POLYGON;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [latI, lonI] = poly[i];
    const [latJ, lonJ] = poly[j];
    const intersects =
      (lonI > lon) !== (lonJ > lon) &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Je li točka unutar nadzorne zone (polumjer MONITOR_RADIUS_NM oko centra
 * kanala). Brza ravninska aproksimacija — zona je mala pa je dovoljno točna.
 */
export function isInMonitorZone(lat: number, lon: number): boolean {
  const dLat = (lat - CHANNEL_CENTER[0]) * 111320;
  const dLon = (lon - CHANNEL_CENTER[1]) * 111320 * Math.cos((CHANNEL_CENTER[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLon) <= MONITOR_RADIUS_NM * 1852;
}

export type ChannelDirection = 'inbound' | 'outbound' | null;

/** Smjer prolaska: uplovljava (prema Šibeniku) ili isplovljava (prema moru) */
export function channelDirection(cog: number | null | undefined): ChannelDirection {
  if (cog == null) return null;
  const dist = Math.abs(((cog - CHANNEL_AXIS_DEG + 540) % 360) - 180);
  return dist <= 90 ? 'inbound' : 'outbound';
}
