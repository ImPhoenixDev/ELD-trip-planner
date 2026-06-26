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
OSRM = "https://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344
TIMEOUT = 20
USER_AGENT = "ELD-Trip-Planner/1.0 (https://github.com)"


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
