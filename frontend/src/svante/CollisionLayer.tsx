import { Fragment } from 'react';
import { CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { PREDICT_S, predict, type Encounter } from './collision';

const COLOR: Record<Encounter['level'], string> = {
  warning: '#f59e0b',
  alarm: '#ef4444',
};

interface Props {
  encounters: Encounter[];
}

/**
 * Vizualizacija rizika sudara na karti:
 *  - isprekidana predviđena putanja svakog rizičnog plovila (PREDICT_S naprijed)
 *  - linija najbližeg približavanja (CPA) između para
 *  - oznake na predviđenim CPA pozicijama
 * Crta od najmanjeg rizika prema najvećem da kritični parovi budu na vrhu.
 */
export function CollisionLayer({ encounters }: Props) {
  const ordered = [...encounters].sort((a, b) => a.cri - b.cri);

  return (
    <>
      {ordered.map((e) => {
        const color = COLOR[e.level];
        // Kreni od dead-reckoning pozicije ("sada"), ne od sirovog (zakašnjelog)
        // očitanja — tako se putanja poklapa s CPA računom. predict(k, 0) = k.pos.
        const aPos = predict(e.a, 0);
        const bPos = predict(e.b, 0);
        const aPredict = predict(e.a, PREDICT_S);
        const bPredict = predict(e.b, PREDICT_S);

        return (
          <Fragment key={e.id}>
            {/* Predviđene putanje */}
            <Polyline
              positions={[aPos, aPredict]}
              pathOptions={{ color, weight: 1.5, opacity: 0.6, dashArray: '4 6' }}
            />
            <Polyline
              positions={[bPos, bPredict]}
              pathOptions={{ color, weight: 1.5, opacity: 0.6, dashArray: '4 6' }}
            />

            {/* Linija najbližeg približavanja (CPA) */}
            <Polyline
              positions={[e.cpaA, e.cpaB]}
              pathOptions={{
                color,
                weight: e.level === 'alarm' ? 2.5 : 1.5,
                opacity: 0.9,
                dashArray: '2 4',
              }}
            >
              <Tooltip direction="center" opacity={0.95}>
                <span style={{ fontWeight: 700 }}>
                  CRI {(e.cri * 100).toFixed(0)}%
                </span>
              </Tooltip>
            </Polyline>

            {/* CPA oznake */}
            <CircleMarker
              center={e.cpaA}
              radius={4}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.5 }}
            />
            <CircleMarker
              center={e.cpaB}
              radius={4}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.5 }}
            />
          </Fragment>
        );
      })}
    </>
  );
}
