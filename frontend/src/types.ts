export interface VesselLive {
  mmsi: number;
  name: string | null;
  lat: number | null;
  lon: number | null;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  nav_status: number | null;
  last_seen: string | null;
}

export interface Vessel {
  mmsi: number;
  imo: number | null;
  name: string | null;
  callsign: string | null;
  ship_type: number | null;
  length: number | null;
  width: number | null;
  draught: number | null;
  destination: string | null;
  last_seen: string | null;
  updated_at: string | null;
}

export interface VesselDetail {
  vessel: Vessel;
  last_position: VesselLive | null;
}

export interface TrackPoint {
  time: string;
  mmsi: number;
  lat: number | null;
  lon: number | null;
  sog: number | null;
  cog: number | null;
}

export interface AtonLive {
  mmsi: number;
  name: string | null;
  aid_type: number | null;
  lat: number | null;
  lon: number | null;
  off_position: boolean;
  virtual_aid: boolean;
  status_raw: number | null;
  alarm: boolean | null;
  light_status: number | null;   // 0-7 (3 bita)
  racon_status: number | null;   // 0-3 (2 bita)
  last_seen: string | null;
}
