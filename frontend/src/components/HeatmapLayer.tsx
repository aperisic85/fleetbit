import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { VesselLive } from '../types';

// Build a 256-entry RGBA lookup table: transparent blue → cyan → green → yellow → red
function buildColorMap(): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0,    'rgba(0,0,255,0)');
  g.addColorStop(0.25, 'rgba(0,255,255,0.65)');
  g.addColorStop(0.5,  'rgba(0,255,0,0.78)');
  g.addColorStop(0.75, 'rgba(255,200,0,0.88)');
  g.addColorStop(1.0,  'rgba(255,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

interface Props { vessels: VesselLive[] }

export function HeatmapLayer({ vessels }: Props) {
  const map = useMap();
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const colorMapRef = useRef<Uint8ClampedArray | null>(null);
  const vesselsRef  = useRef(vessels);
  const rafRef      = useRef(0);

  // Keep vessels ref in sync without re-creating draw
  useEffect(() => { vesselsRef.current = vessels; });

  useEffect(() => {
    colorMapRef.current = buildColorMap();

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '400',
      opacity: '0',
      transition: 'opacity 0.4s ease',
    });
    map.getContainer().appendChild(canvas);
    canvasRef.current = canvas;

    // Fade in after first render
    requestAnimationFrame(() => { canvas.style.opacity = '0.85'; });

    return () => { canvas.remove(); };
  }, [map]);

  const draw = () => {
    const canvas = canvasRef.current;
    const cm     = colorMapRef.current;
    if (!canvas || !cm) return;

    const { x: W, y: H } = map.getSize();
    canvas.width  = W;
    canvas.height = H;

    const zoom = map.getZoom();
    const r = zoom < 5 ? 72 : zoom < 7 ? 52 : zoom < 9 ? 36 : zoom < 12 ? 22 : 14;

    // --- Pass 1: draw intensity layer on offscreen canvas ---
    const off  = document.createElement('canvas');
    off.width  = W;
    off.height = H;
    const octx = off.getContext('2d')!;
    octx.globalCompositeOperation = 'lighter';

    for (const v of vesselsRef.current) {
      if (v.lat == null || v.lon == null) continue;
      const p = map.latLngToContainerPoint([v.lat, v.lon]);
      if (p.x < -r || p.x > W + r || p.y < -r || p.y > H + r) continue;

      const g = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(p.x, p.y, r, 0, Math.PI * 2);
      octx.fill();
    }

    // --- Pass 2: colorize via lookup table ---
    const imgData = octx.getImageData(0, 0, W, H);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;
      const idx = Math.min(a, 255) * 4;
      d[i]     = cm[idx];
      d[i + 1] = cm[idx + 1];
      d[i + 2] = cm[idx + 2];
      d[i + 3] = cm[idx + 3];
    }

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(imgData, 0, 0);
  };

  const scheduleRedraw = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  useMapEvents({ move: scheduleRedraw, zoomend: scheduleRedraw, resize: scheduleRedraw });
  useEffect(scheduleRedraw, [vessels]);

  return null;
}
