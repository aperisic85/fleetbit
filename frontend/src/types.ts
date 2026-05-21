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
  // AIS tip 8, DAC 001, FI 31 — meteorološki podaci
  wind_speed: number | null;     // čvorovi
  wind_gust: number | null;      // čvorovi
  wind_dir: number | null;       // stupnjevi
  air_temp: number | null;       // °C
  humidity: number | null;       // %
  dew_point: number | null;      // °C
  air_pressure: number | null;   // hPa
  visibility: number | null;     // nm
  water_temp: number | null;     // °C
  wave_height: number | null;    // m
  wave_period: number | null;    // s
  wave_dir: number | null;       // stupnjevi
  precipitation: number | null;  // 1=kiša,2=grmljavina,3=ledena kiša,4=mješano,5=snijeg
  meteo_at: string | null;
}
