import { useMemo } from 'react';
import { buildCumulative, pointAtMiles } from '../../../lib/route';
import type { Place, StopKind, TripPlanResponse, TripStop } from '../../../types/trip';

const PLACED_STOP_KINDS: StopKind[] = ['fuel', 'break', 'rest', 'restart'];
const US_CENTER: [number, number] = [39.5, -98.35];

export interface NamedMarker extends Place {
  kind: 'current' | 'pickup' | 'dropoff';
  time?: string;
}

export interface PlacedStop extends TripStop {
  lat: number;
  lng: number;
  id: string;
}

export function useMapData(data: TripPlanResponse) {
  const { route, places, stops } = data;
  const geometry = useMemo(() => route.geometry ?? [], [route.geometry]);
  const cum = useMemo(() => buildCumulative(geometry), [geometry]);

  const namedMarkers = useMemo<NamedMarker[]>(
    () => [
      { ...places.current, kind: 'current', time: data.summary.start_time },
      { ...places.pickup, kind: 'pickup' },
      { ...places.dropoff, kind: 'dropoff' },
    ],
    [places, data.summary.start_time],
  );

  const placedStops = useMemo<PlacedStop[]>(() => {
    return (stops ?? [])
      .filter((s) => PLACED_STOP_KINDS.includes(s.kind))
      .map((s, i) => {
        const pt = pointAtMiles(geometry, cum, s.miles);
        return pt ? { ...s, lat: pt[0], lng: pt[1], id: `${s.kind}-${i}` } : null;
      })
      .filter((s): s is PlacedStop => s !== null);
  }, [stops, geometry, cum]);

  const bounds = useMemo<[number, number][]>(
    () => (geometry.length > 0 ? geometry : namedMarkers.map((m) => [m.lat, m.lng] as [number, number])),
    [geometry, namedMarkers],
  );

  const center: [number, number] = namedMarkers[0]
    ? [namedMarkers[0].lat, namedMarkers[0].lng]
    : US_CENTER;

  return { geometry, namedMarkers, placedStops, bounds, center };
}
