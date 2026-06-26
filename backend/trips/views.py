"""API views for the ELD Trip Planner."""

from datetime import datetime, timedelta

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from trips.services.geo import GeoError, directions, geocode
from trips.services.hos import plan_trip


def _parse_start(value):
    if not value:
        return datetime.combine(datetime.now().date(), datetime.min.time()) + timedelta(hours=8)
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except ValueError:
        return datetime.combine(datetime.now().date(), datetime.min.time()) + timedelta(hours=8)


@api_view(["GET"])
def health(_request):
    return Response({"status": "ok"})


@api_view(["POST"])
def plan_trip_view(request):
    data = request.data or {}
    current = (data.get("current_location") or "").strip()
    pickup = (data.get("pickup_location") or "").strip()
    dropoff = (data.get("dropoff_location") or "").strip()

    errors = {}
    if not current:
        errors["current_location"] = "This field is required."
    if not pickup:
        errors["pickup_location"] = "This field is required."
    if not dropoff:
        errors["dropoff_location"] = "This field is required."

    try:
        cycle_hours = float(data.get("current_cycle_used", 0) or 0)
    except (TypeError, ValueError):
        cycle_hours = None
        errors["current_cycle_used"] = "Must be a number."
    else:
        if cycle_hours < 0 or cycle_hours > 70:
            errors["current_cycle_used"] = "Must be between 0 and 70 hours."

    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    start_dt = _parse_start(data.get("start_time"))

    try:
        current_pt = geocode(current)
        pickup_pt = geocode(pickup)
        dropoff_pt = geocode(dropoff)
        route = directions([current_pt, pickup_pt, dropoff_pt])
    except GeoError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    leg_miles = route.get("leg_miles") or []
    leg_a_miles = leg_miles[0] if leg_miles else route["distance_miles"] / 2.0

    plan = plan_trip(
        total_miles=route["distance_miles"],
        total_drive_minutes=route["duration_minutes"],
        leg_a_miles=leg_a_miles,
        current_cycle_hours=cycle_hours,
        start_dt=start_dt,
    )

    return Response(
        {
            "inputs": {
                "current_location": current,
                "pickup_location": pickup,
                "dropoff_location": dropoff,
                "current_cycle_used": cycle_hours,
            },
            "places": {
                "current": current_pt,
                "pickup": pickup_pt,
                "dropoff": dropoff_pt,
            },
            "route": {
                "geometry": route["geometry"],
                "distance_miles": round(route["distance_miles"], 1),
                "duration_minutes": round(route["duration_minutes"], 1),
                "leg_miles": [round(m, 1) for m in leg_miles],
                "approximate": route.get("approximate", False),
            },
            **plan,
        }
    )
