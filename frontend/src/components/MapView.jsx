import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { buildCumulative, pointAtMiles } from "../lib/route";
import { STOP_META, fmtTime } from "../lib/constants";

function pinIcon(meta, big = false) {
  const size = big ? 30 : 24;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${meta.color};
      border:2px solid white;
      box-shadow:0 2px 6px rgba(2,6,23,.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font:700 ${big ? 13 : 11}px Inter,sans-serif;">${meta.emoji}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useMemo(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export default function MapView({ data }) {
  const { route, places, stops } = data;
  const geometry = route.geometry || [];

  const cum = useMemo(() => buildCumulative(geometry), [geometry]);

  const namedMarkers = useMemo(
    () => [
      { ...places.current, kind: "current", time: data.summary.start_time },
      { ...places.pickup, kind: "pickup" },
      { ...places.dropoff, kind: "dropoff" },
    ],
    [places, data.summary.start_time]
  );

  // Place intermediate stops (fuel/break/rest) by interpolating along the route.
  const placedStops = useMemo(() => {
    return (stops || [])
      .filter((s) => ["fuel", "break", "rest", "restart"].includes(s.kind))
      .map((s, i) => {
        const pt = pointAtMiles(geometry, cum, s.miles);
        return pt ? { ...s, lat: pt[0], lng: pt[1], id: `${s.kind}-${i}` } : null;
      })
      .filter(Boolean);
  }, [stops, geometry, cum]);

  const bounds = useMemo(
    () => geometry.length > 0 ? geometry : namedMarkers.map((m) => [m.lat, m.lng]),
    [geometry, namedMarkers]
  );

  const center = namedMarkers[0] ? [namedMarkers[0].lat, namedMarkers[0].lng] : [39.5, -98.35];

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={bounds} />

      {geometry.length > 1 && (
        <Polyline positions={geometry} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }} />
      )}

      {namedMarkers.map((m) => {
        const meta = STOP_META[m.kind];
        return (
          <Marker key={m.kind} position={[m.lat, m.lng]} icon={pinIcon(meta, true)}>
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
          <Marker key={s.id} position={[s.lat, s.lng]} icon={pinIcon(meta)}>
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
