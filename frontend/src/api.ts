const BASE = '/api/v1';

export async function fetchLiveVessels() {
  const res = await fetch(`${BASE}/vessels/live`);
  if (!res.ok) throw new Error('Failed to fetch live vessels');
  return res.json();
}

export async function fetchVessel(mmsi: number) {
  const res = await fetch(`${BASE}/vessels/${mmsi}`);
  if (!res.ok) throw new Error(`Failed to fetch vessel ${mmsi}`);
  return res.json();
}

export async function fetchTrack(mmsi: number, from?: string, to?: string, limit = 2000) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`${BASE}/vessels/${mmsi}/track?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch track for ${mmsi}`);
  return res.json();
}

export function createWebSocket(onMessage: (data: unknown) => void): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      // ignore malformed
    }
  };
  return ws;
}
