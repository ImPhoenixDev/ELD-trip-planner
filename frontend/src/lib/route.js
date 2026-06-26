// Helpers for working with the route polyline returned by the API.

function haversineMiles(a, b) {
  const R = 3958.7613;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Precompute cumulative distances so we can place a marker at N miles.
export function buildCumulative(geometry) {
  const cum = [0];
  for (let i = 1; i < geometry.length; i++) {
    cum.push(cum[i - 1] + haversineMiles(geometry[i - 1], geometry[i]));
  }
  return cum;
}

// Find the [lat, lng] point at a given mileage along the route.
export function pointAtMiles(geometry, cum, miles) {
  if (!geometry || geometry.length === 0) return null;
  const total = cum[cum.length - 1] || 0;
  if (total === 0) return geometry[0];
  const target = Math.max(0, Math.min(miles, total));
  // Binary search for the segment containing `target`.
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const segLen = cum[i] - cum[i - 1] || 1;
  const f = (target - cum[i - 1]) / segLen;
  const a = geometry[i - 1];
  const b = geometry[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
