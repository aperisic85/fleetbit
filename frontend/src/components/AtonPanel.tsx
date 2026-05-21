import type { AtonLive } from '../types';
import { aidTypeLabel, atonHealth, HEALTH_COLOR, LIGHT_STATUS, RACON_STATUS } from '../aton';

const PRECIP_LABEL: Record<number, string> = {
  1: 'Kiša',
  2: 'Grmljavinska oluja',
  3: 'Ledena kiša',
  4: 'Mješano / led',
  5: 'Snijeg',
};

function deg_to_compass(deg: number): string {
  const dirs = ['S', 'SSI', 'SI', 'ISI', 'I', 'IJS', 'JS', 'JJS',
                'J', 'JJZ', 'JZ', 'ZJZ', 'Z', 'ZSZ', 'SZ', 'SSZ'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginRight: 8 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {title}
    </div>
  );
}

interface Props {
  aton: AtonLive;
  onClose: () => void;
}

export function AtonPanel({ aton, onClose }: Props) {
  const health = atonHealth(aton);
  const healthColor = HEALTH_COLOR[health];
  const lightInfo = aton.light_status != null ? LIGHT_STATUS[aton.light_status] : null;
  const raconInfo = aton.racon_status != null ? RACON_STATUS[aton.racon_status] : null;

  const hasMeteo = aton.meteo_at != null || aton.wind_speed != null || aton.air_temp != null;

  return (
    <div style={{ padding: 16, overflowY: 'auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: healthColor, flexShrink: 0,
          boxShadow: `0 0 6px ${healthColor}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {aton.name ?? `MMSI ${aton.mmsi}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>MMSI {aton.mmsi}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 20, padding: '0 4px',
            lineHeight: 1, flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* Alarmi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {aton.alarm && <StatusBadge label="⚠ ALARM" color="#ef4444" />}
        {aton.off_position && <StatusBadge label="⚓ Izvan pozicije" color="#f59e0b" />}
        {aton.virtual_aid && <StatusBadge label="Virtualni AtoN" color="#8b5cf6" />}
        {!aton.alarm && !aton.off_position && health === 'ok' && (
          <StatusBadge label="✓ Sve uredno" color="#22c55e" />
        )}
      </div>

      {/* Status bitovi */}
      <SectionTitle title="Status" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, marginBottom: 4, background: aton.alarm ? '#ef444422' : 'transparent', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 12 }}>Alarm</span>
        <StatusBadge
          label={aton.alarm == null ? 'N/A' : aton.alarm ? 'ALARM' : 'OK'}
          color={aton.alarm ? '#ef4444' : aton.alarm === false ? '#22c55e' : '#64748b'}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, marginBottom: 4, border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 12 }}>Svjetlo</span>
        {lightInfo
          ? <StatusBadge label={lightInfo.label} color={lightInfo.color} />
          : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>N/A</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 12 }}>RACON</span>
        {raconInfo
          ? <StatusBadge label={raconInfo.label} color={raconInfo.color} />
          : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>N/A</span>}
      </div>

      {/* Meteorološki podaci */}
      {hasMeteo && (
        <>
          <SectionTitle title="Meteorologija" />

          {/* Vjetar */}
          {(aton.wind_speed != null || aton.wind_dir != null) && (
            <div style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 4, background: 'var(--bg-base)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Vjetar</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {aton.wind_dir != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {deg_to_compass(aton.wind_dir)} ({aton.wind_dir}°)
                    </span>
                  )}
                  {aton.wind_speed != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {aton.wind_speed.toFixed(0)} kn
                    </span>
                  )}
                  {aton.wind_gust != null && aton.wind_gust > 0 && (
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>
                      udari {aton.wind_gust.toFixed(0)} kn
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Temperatura i vlažnost */}
          {(aton.air_temp != null || aton.humidity != null || aton.dew_point != null) && (
            <div style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 4, background: 'var(--bg-base)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Atmosfera</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {aton.air_temp != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.air_temp.toFixed(1)}°C</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Temp. zraka</div>
                  </div>
                )}
                {aton.humidity != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.humidity}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Vlažnost</div>
                  </div>
                )}
                {aton.dew_point != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.dew_point.toFixed(1)}°C</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Rosište</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tlak i vidljivost */}
          {(aton.air_pressure != null || aton.visibility != null) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
              {aton.air_pressure != null && (
                <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-base)', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.air_pressure} hPa</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Tlak zraka</div>
                </div>
              )}
              {aton.visibility != null && (
                <div style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-base)', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.visibility.toFixed(1)} nm</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Vidljivost</div>
                </div>
              )}
            </div>
          )}

          {/* Valovi i more */}
          {(aton.wave_height != null || aton.water_temp != null) && (
            <div style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 4, background: 'var(--bg-base)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>More</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {aton.wave_height != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.wave_height.toFixed(1)} m</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Visina vala</div>
                  </div>
                )}
                {aton.wave_period != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{aton.wave_period} s</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Period vala</div>
                  </div>
                )}
                {aton.water_temp != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>{aton.water_temp.toFixed(1)}°C</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Temp. mora</div>
                  </div>
                )}
              </div>
              {aton.wave_dir != null && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
                  Smjer valova: {deg_to_compass(aton.wave_dir)} ({aton.wave_dir}°)
                </div>
              )}
            </div>
          )}

          {/* Oborine */}
          {aton.precipitation != null && aton.precipitation > 0 && (
            <Row label="Oborine" value={PRECIP_LABEL[aton.precipitation] ?? `Kod ${aton.precipitation}`} />
          )}

          {/* Ažuriranje */}
          {aton.meteo_at && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, textAlign: 'right' }}>
              Meteo ažurirano: {new Date(aton.meteo_at).toLocaleTimeString('hr-HR')}
            </div>
          )}
        </>
      )}

      {/* Detalji */}
      <SectionTitle title="Informacije" />
      <Row label="Tip" value={aidTypeLabel(aton.aid_type)} />
      {aton.lat != null && aton.lon != null && (
        <Row
          label="Pozicija"
          value={`${aton.lat.toFixed(5)}° / ${aton.lon.toFixed(5)}°`}
        />
      )}
      {aton.last_seen && (
        <Row
          label="Zadnji signal"
          value={new Date(aton.last_seen).toLocaleTimeString('hr-HR')}
        />
      )}
      {aton.status_raw != null && (
        <Row
          label="Status (raw)"
          value={`0x${(aton.status_raw & 0xFF).toString(16).padStart(2, '0').toUpperCase()}`}
        />
      )}
    </div>
  );
}
