import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface FitBoundsProps {
  points: [number, number][];
}

export default function FitBounds({ points }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}
