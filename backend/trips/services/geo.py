"""Geocoding + truck routing.

Primary provider is OpenRouteService (free API key). To keep the app fully
functional even without a key (or if ORS is rate-limited / down), we fall back
to keyless OpenStreetMap services: Nominatim for geocoding and the public OSRM
demo server for routing. A final great-circle estimate guarantees a result.
"""

from __future__ import annotations

import math
from typing import List, Tuple

import requests
from django.conf import settings

ORS_BASE = "https://api.openrouteservice.org"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"
PHOTON = "https://photon.komoot.io/api/"
OSRM = "https://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344
TIMEOUT = 20
USER_AGENT = "ELD-Trip-Planner/1.0 (https://github.com)"

US_STATE_ABBREV = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH",
    "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
    "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN",
    "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}


class GeoError(Exception):
    """Raised when a location cannot be resolved at all."""


# ---------------------------------------------------------------------- #
# Geocoding
# ---------------------------------------------------------------------- #
def _geocode_ors(text: str, key: str) -> dict:
    resp = requests.get(
        f"{ORS_BASE}/geocode/search",
        params={"api_key": key, "text": text, "size": 1},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    features = resp.json().get("features") or []
    if not features:
        raise GeoError("no result")
    lng, lat = features[0]["geometry"]["coordinates"]
    label = features[0].get("properties", {}).get("label", text)
    return {"lat": lat, "lng": lng, "label": label}


def _geocode_nominatim(text: str) -> dict:
    resp = requests.get(
        NOMINATIM,
        params={"q": text, "format": "json", "limit": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise GeoError("no result")
    top = results[0]
    return {
        "lat": float(top["lat"]),
        "lng": float(top["lon"]),
        "label": top.get("display_name", text),
    }


def _autocomplete_ors(text: str, key: str) -> List[dict]:
    resp = requests.get(
        f"{ORS_BASE}/geocode/autocomplete",
        params={"api_key": key, "text": text, "boundary.country": "US", "size": 6},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    out = []
    for feat in resp.json().get("features") or []:
        coords = (feat.get("geometry") or {}).get("coordinates")
        label = (feat.get("properties") or {}).get("label")
        if coords and label:
            out.append({"label": label, "lat": coords[1], "lng": coords[0]})
    return out


def _autocomplete_photon(text: str) -> List[dict]:
    resp = requests.get(
        PHOTON,
        params={"q": text, "limit": 6, "lang": "en"},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    out = []
    for feat in resp.json().get("features") or []:
        coords = (feat.get("geometry") or {}).get("coordinates")
        if not coords:
            continue
        props = feat.get("properties") or {}
        name = props.get("name")
        city = props.get("city")
        state = _shorten_state(props.get("state", "")) or props.get("state")
        country = props.get("country")
        parts, seen = [], set()
        for part in (name, city if city != name else None, state, country):
            if part and part not in seen:
                parts.append(part)
                seen.add(part)
        label = ", ".join(parts)
        if label:
            out.append({"label": label, "lat": coords[1], "lng": coords[0]})
    return out


def _autocomplete_nominatim(text: str) -> List[dict]:
    resp = requests.get(
        NOMINATIM,
        params={"q": text, "format": "json", "limit": 6},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return [
        {"label": r.get("display_name", text), "lat": float(r["lat"]), "lng": float(r["lon"])}
        for r in resp.json()
        if r.get("lat") and r.get("lon")
    ]


def autocomplete(text: str) -> List[dict]:
    """Return up to ~6 location suggestions [{label, lat, lng}] for a partial query.

    Prefers ORS autocomplete (uses the API key, US-biased); falls back to the
    keyless Photon typeahead service, then Nominatim search.
    """
    text = (text or "").strip()
    if len(text) < 3:
        return []

    key = settings.ORS_API_KEY
    if key:
        try:
            results = _autocomplete_ors(text, key)
            if results:
                return results
        except (requests.RequestException, KeyError, ValueError, TypeError):
            pass
    try:
        results = _autocomplete_photon(text)
        if results:
            return results
    except (requests.RequestException, KeyError, ValueError, TypeError):
        pass
    try:
        return _autocomplete_nominatim(text)
    except (requests.RequestException, KeyError, ValueError, TypeError):
        return []


def geocode(text: str) -> dict:
    """Resolve free-text location to {lat, lng, label}."""
    text = (text or "").strip()
    if not text:
        raise GeoError("Location text is empty.")

    key = settings.ORS_API_KEY
    if key:
        try:
            return _geocode_ors(text, key)
        except (requests.RequestException, GeoError, KeyError, ValueError):
            pass
    try:
        return _geocode_nominatim(text)
    except (requests.RequestException, GeoError, KeyError, ValueError) as exc:
        raise GeoError(f'Could not find a location for "{text}".') from exc


# ---------------------------------------------------------------------- #
# Routing
# ---------------------------------------------------------------------- #
def _haversine_miles(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lng1 = a
    lat2, lng2 = b
    r = 3958.7613
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def _route_ors(points: List[dict], key: str) -> dict:
    body = {"coordinates": [[p["lng"], p["lat"]] for p in points]}
    resp = requests.post(
        f"{ORS_BASE}/v2/directions/driving-hgv/geojson",
        json=body,
        headers={"Authorization": key, "Content-Type": "application/json"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    feature = resp.json()["features"][0]
    geometry = [[lat, lng] for lng, lat in feature["geometry"]["coordinates"]]
    summary = feature["properties"]["summary"]
    segments = feature["properties"].get("segments", [])
    return {
        "distance_miles": summary["distance"] / METERS_PER_MILE,
        "duration_minutes": summary["duration"] / 60.0,
        "geometry": geometry,
        "leg_miles": [seg["distance"] / METERS_PER_MILE for seg in segments],
        "approximate": False,
    }


def _route_osrm(points: List[dict]) -> dict:
    coord_str = ";".join(f"{p['lng']},{p['lat']}" for p in points)
    resp = requests.get(
        f"{OSRM}/{coord_str}",
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    route = data["routes"][0]
    geometry = [[lat, lng] for lng, lat in route["geometry"]["coordinates"]]
    leg_miles = [leg["distance"] / METERS_PER_MILE for leg in route.get("legs", [])]
    return {
        "distance_miles": route["distance"] / METERS_PER_MILE,
        "duration_minutes": route["duration"] / 60.0,
        "geometry": geometry,
        "leg_miles": leg_miles,
        "approximate": False,
    }


def _route_fallback(points: List[dict]) -> dict:
    coords = [(p["lat"], p["lng"]) for p in points]
    legs, total = [], 0.0
    geometry = [[points[0]["lat"], points[0]["lng"]]]
    for a, b in zip(coords, coords[1:]):
        miles = _haversine_miles(a, b)
        legs.append(miles)
        total += miles
        geometry.append([b[0], b[1]])
    duration_min = total / max(settings.AVERAGE_SPEED_MPH, 1) * 60.0
    return {
        "distance_miles": total,
        "duration_minutes": duration_min,
        "geometry": geometry,
        "leg_miles": legs,
        "approximate": True,
    }


def directions(points: List[dict]) -> dict:
    """Truck route through ordered waypoints (list of {lat, lng})."""
    if len(points) < 2:
        raise GeoError("At least two waypoints are required for a route.")

    key = settings.ORS_API_KEY
    if key:
        try:
            return _route_ors(points, key)
        except (requests.RequestException, KeyError, IndexError, ValueError):
            pass
    try:
        return _route_osrm(points)
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return _route_fallback(points)


# ---------------------------------------------------------------------- #
# Reverse geocoding (for ELD log remarks: "City, ST")
# ---------------------------------------------------------------------- #
def _shorten_state(name: str) -> str:
    if not name:
        return ""
    return US_STATE_ABBREV.get(name.strip().lower(), name)


def _reverse_ors(lat: float, lng: float, key: str):
    resp = requests.get(
        f"{ORS_BASE}/geocode/reverse",
        params={"api_key": key, "point.lat": lat, "point.lon": lng, "size": 1},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    features = resp.json().get("features") or []
    if not features:
        return None
    props = features[0].get("properties", {})
    city = props.get("locality") or props.get("localadmin") or props.get("county") or props.get("region")
    state = props.get("region_a") or _shorten_state(props.get("region", ""))
    return ", ".join([p for p in [city, state] if p]) or props.get("label")


def _reverse_nominatim(lat: float, lng: float):
    resp = requests.get(
        NOMINATIM_REVERSE,
        params={"lat": lat, "lon": lng, "format": "json", "zoom": 10, "addressdetails": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    addr = resp.json().get("address", {})
    city = (
        addr.get("city") or addr.get("town") or addr.get("village") or addr.get("hamlet")
        or addr.get("county") or addr.get("state")
    )
    state = _shorten_state(addr.get("state", ""))
    return ", ".join([p for p in [city, state] if p]) or None


def reverse_geocode(lat: float, lng: float):
    """Resolve coordinates to a short 'City, ST' string (best effort)."""
    key = settings.ORS_API_KEY
    if key:
        try:
            result = _reverse_ors(lat, lng, key)
            if result:
                return result
        except (requests.RequestException, KeyError, IndexError, ValueError):
            pass
    try:
        return _reverse_nominatim(lat, lng)
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return None


# ---------------------------------------------------------------------- #
# Route interpolation (place a point at N miles along the geometry)
# ---------------------------------------------------------------------- #
def build_cumulative(geometry: List[list]) -> List[float]:
    cum = [0.0]
    for i in range(1, len(geometry)):
        a = (geometry[i - 1][0], geometry[i - 1][1])
        b = (geometry[i][0], geometry[i][1])
        cum.append(cum[-1] + _haversine_miles(a, b))
    return cum


def point_at_miles(geometry: List[list], cum: List[float], miles: float):
    if not geometry:
        return None
    total = cum[-1] if cum else 0.0
    if total <= 0:
        return geometry[0]
    target = max(0.0, min(miles, total))
    lo, hi = 0, len(cum) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if cum[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    i = max(1, lo)
    seg = (cum[i] - cum[i - 1]) or 1.0
    f = (target - cum[i - 1]) / seg
    a, b = geometry[i - 1], geometry[i]
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
