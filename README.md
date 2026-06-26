# ELD Trip Planner

A full-stack app that turns trip details into a route plan and FMCSA-compliant
daily **ELD (Electronic Logging Device) log sheets**. Enter where you are, where
you're picking up and dropping off, and how many hours you've already used in
your 70-hour cycle — the app maps the route, schedules the legally required
breaks, fuel stops and rests, and draws a filled-out log sheet for each day of
the trip.

- **Backend:** Django + Django REST Framework (pure-Python Hours-of-Service engine)
- **Frontend:** React (Vite) + Tailwind CSS + React-Leaflet (OpenStreetMap)
- **Routing / geocoding:** OpenRouteService (free key), with keyless OpenStreetMap
  (Nominatim + OSRM) fallbacks so the app works even without an API key.

## Live demo

- App (frontend): _add your Vercel URL_
- API (backend): _add your Render URL_

## What it does

**Inputs**

- Current location
- Pickup location
- Drop-off location
- Current cycle used (hours of the 70)

**Outputs**

- An interactive map with the route and markers for the start, pickup, drop-off,
  fuel stops, 30-minute breaks and 10-hour rests.
- One drawn daily log sheet per day, with the duty-status step line plotted on a
  24-hour grid, per-status totals, and a remarks line.

## Hours-of-Service rules modeled

Assumptions from the brief: property-carrying driver on the 70-hour / 8-day
cycle, no adverse driving conditions, fuel at least every 1,000 miles, and 1
hour each for pickup and drop-off.

| Rule | Value |
| --- | --- |
| Max driving per duty period | 11 hours |
| On-duty window (does not pause) | 14 hours |
| Break required after | 8 hours of driving (30-minute break) |
| Daily reset | 10 consecutive hours off duty |
| Cycle limit | 70 hours / 8 days (34-hour restart when exhausted) |
| Pickup / drop-off | 1 hour on-duty each |
| Fuel stop | 30 min on-duty, at least every 1,000 miles |

Per the 2020 rule, any non-driving period of 30+ minutes (including on-duty
fuel/pickup stops) satisfies the 30-minute break requirement.

The engine lives in [`backend/trips/services/hos.py`](backend/trips/services/hos.py)
and is fully unit-tested in [`backend/trips/tests.py`](backend/trips/tests.py).

## Architecture

```
React (Vite) ── POST /api/plan-trip/ ──> Django REST API
                                          ├─ geo.py   (geocode + truck routing)
                                          └─ hos.py   (HOS simulation -> segments -> daily logs)
        <── route geometry, stops, per-day log sheets (JSON) ──┘
```

## Local development

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # optionally add an ORS_API_KEY
python manage.py migrate
python manage.py runserver 8000
```

Run the tests:

```bash
python manage.py test trips
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_BASE_URL=http://localhost:8000
npm run dev                     # http://localhost:5173
```

## Environment variables

**Backend**

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django secret key (set in production) |
| `DJANGO_DEBUG` | `True` locally, `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins (Vercel URL) |
| `ORS_API_KEY` | OpenRouteService key (optional; falls back to OSM) |
| `AVERAGE_SPEED_MPH` | Speed for the great-circle fallback (default 55) |

**Frontend**

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the Django API |

## Deployment

### Backend → Render

The repo includes [`render.yaml`](render.yaml) and
[`backend/build.sh`](backend/build.sh).

1. Push this repo to GitHub.
2. On Render: **New → Blueprint**, select the repo. Render reads `render.yaml`.
3. Set `ORS_API_KEY` (recommended) and `CORS_ALLOWED_ORIGINS` (your Vercel URL).
4. Build runs `./build.sh`; start runs `gunicorn config.wsgi:application`.

### Frontend → Vercel

1. On Vercel: **New Project**, import the repo, set **Root Directory** to `frontend`.
2. Add env var `VITE_API_BASE_URL` = your Render API URL.
3. Deploy. `*.vercel.app` origins are already allowed by the backend's CORS regex.

## Notes & limitations

- Without `ORS_API_KEY`, geocoding uses Nominatim and routing uses OSRM; if both
  are unavailable the app shows a straight-line estimate (flagged in the UI).
- Times are clock times starting at 08:00 on the first day for a clean log grid.
- For planning/demonstration only — not an official record of duty status.
