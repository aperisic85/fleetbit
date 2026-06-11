// ── Kanal sv. Ante (Šibenik) — geometrija i pravila nadzora ─────────────────
//
// Koordinate obrisa kanala su aproksimacija korita kanala (širina ~250 m)
// od ulaza kod tvrđave sv. Nikole do izlaza u šibenski zaljev.
// Po potrebi prilagodi točke stvarnom obrisu — sva logika čita samo ovaj popis.

/** Ograničenje brzine u kanalu (čvorovi) */
export const SPEED_LIMIT_KN = 5;

/** Približni smjer osi kanala more → Šibenik (stupnjevi) */
export const CHANNEL_AXIS_DEG = 56;

/** Centar kanala — početni fokus karte */
export const CHANNEL_CENTER: [number, number] = [43.7291, 15.8672];
export const CHANNEL_ZOOM = 15;

/**
 * Obris kanala: prvo sjeverozapadna obala (od mora prema Šibeniku),
 * zatim jugoistočna obala natrag prema moru.
 */
export const CHANNEL_POLYGON: [number, number][] = [
  // SZ obala — od mora (tvrđava sv. Nikole) prema Šibeniku
  [43.7241, 15.8540],
  [43.7267, 15.8582],
  [43.7289, 15.8627],
  [43.7309, 15.8682],
  [43.7331, 15.8737],
  [43.7351, 15.8787],
  // JI obala — natrag od Šibenika prema moru
  [43.7333, 15.8803],
  [43.7313, 15.8753],
  [43.7291, 15.8698],
  [43.7271, 15.8643],
  [43.7249, 15.8598],
  [43.7223, 15.8556],
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

export type ChannelDirection = 'inbound' | 'outbound' | null;

/** Smjer prolaska: uplovljava (prema Šibeniku) ili isplovljava (prema moru) */
export function channelDirection(cog: number | null | undefined): ChannelDirection {
  if (cog == null) return null;
  const dist = Math.abs(((cog - CHANNEL_AXIS_DEG + 540) % 360) - 180);
  return dist <= 90 ? 'inbound' : 'outbound';
}
