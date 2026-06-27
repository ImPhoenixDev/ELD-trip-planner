import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { STOP_META, fmtTime } from '../../../../lib/constants';
import type { TripPlanResponse } from '../../../../types/trip';
import { useMapData } from '../../hooks/useMapData';
import { createPinIcon } from './mapIcons';
import FitBounds from './FitBounds';

interface MapViewProps {
  data: TripPlanResponse;
}

export default function MapView({ data }: MapViewProps) {
  const { geometry, namedMarkers, placedStops, bounds, center } = useMapData(data);

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={bounds} />

      {geometry.length > 1 && (
        <Polyline positions={geometry} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
      )}

      {namedMarkers.map((m) => {
        const meta = STOP_META[m.kind];
        return (
          <Marker key={m.kind} position={[m.lat, m.lng]} icon={createPinIcon(meta, true)}>
            <Popup>
              <strong>{meta.label}</strong>
              <br />
              {m.location || m.label}
              {m.time && (
                <>
                  <br />
                  <span className="text-slate-500">{fmtTime(m.time)}</span>
                </>
              )}
            </Popup>
          </Marker>
        );
      })}

      {placedStops.map((s) => {
        const meta = STOP_META[s.kind];
        return (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={createPinIcon(meta)}>
            <Popup>
              <strong>{meta.label}</strong>
              {s.location && (
                <>
                  <br />
                  {s.location}
                </>
              )}
              <br />
              {fmtTime(s.time)} · ~{Math.round(s.miles)} mi
              <br />
              {s.duration_min} min stop
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
