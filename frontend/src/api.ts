const BASE = '/api/v1';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('fb_auth');
    if (raw) return JSON.parse(raw)?.token ?? null;
  } catch {
    // ignore
  }
  return null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; password: string; company_name?: string }

export async function apiLogin(payload: LoginPayload) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Prijava nije uspjela');
  }
  return res.json();
}

export async function apiRegister(payload: RegisterPayload) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Registracija nije uspjela');
  }
  return res.json();
}

export async function apiMe() {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Nije moguće dohvatiti korisnika');
  return res.json();
}

// ── Vessels ──────────────────────────────────────────────────────────────────

export async function fetchLiveVessels() {
  const res = await fetch(`${BASE}/vessels/live`);
  if (!res.ok) throw new Error('Failed to fetch live vessels');
  return res.json();
}

export async function fetchVessel(mmsi: number) {
  const res = await fetch(`${BASE}/vessels/${mmsi}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch vessel ${mmsi}`);
  return res.json();
}

export async function fetchTrack(mmsi: number, from?: string, to?: string, limit = 2000) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`${BASE}/vessels/${mmsi}/track?${params}`, { headers: authHeaders() });
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
