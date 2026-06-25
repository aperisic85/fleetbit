// ── Zvučni alarm (WebAudio) ──────────────────────────────────────────────────
// Zajednički generator tonova za nadzor kanala i detekciju rizika sudara.

let audioCtx: AudioContext | null = null;

function playTone(freq: number, start: number, dur: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + start + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + dur + 0.05);
}

/**
 * Kratki zvučni signal.
 *  - 'warning' — dvotonski (susret / rizik se pojavio)
 *  - 'alarm'   — četverotonski (prekoračenje / neposredan rizik sudara)
 *  - 'collision' — silazni dvotonski "honk" (specifično za rizik sudara)
 */
export function beep(kind: 'warning' | 'alarm' | 'collision') {
  try {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    if (kind === 'warning') {
      playTone(660, 0, 0.18);
      playTone(660, 0.28, 0.18);
    } else if (kind === 'collision') {
      playTone(520, 0, 0.22);
      playTone(390, 0.26, 0.30);
    } else {
      playTone(880, 0, 0.15);
      playTone(1100, 0.2, 0.15);
      playTone(880, 0.4, 0.15);
      playTone(1100, 0.6, 0.25);
    }
  } catch {
    // zvuk nije kritičan — ignoriraj (npr. autoplay policy)
  }
}
