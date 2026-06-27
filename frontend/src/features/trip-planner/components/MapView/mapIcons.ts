import L from 'leaflet';
import type { StopMetaEntry } from '../../../../lib/constants';

export function createPinIcon(meta: StopMetaEntry, big = false) {
  const size = big ? 30 : 24;
  return L.divIcon({
    className: '',
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
