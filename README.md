# ELD Trip Planner

A full-stack app that turns trip details into a route plan and FMCSA-compliant
daily **ELD (Electronic Logging Device) log sheets**. Enter where you are, where
you're picking up and dropping off, and how many hours you've already used in
your 70-hour cycle — the app maps the route, schedules the legally required
breaks, fuel stops and rests, and draws a filled-out log sheet for each day of
the trip.

- **Backend:** Django + Django REST Framework (pure-Python Hours-of-Service engine)
- **Frontend:** React (Vite, TypeScript) + Tailwind CSS + React-Leaflet (OpenStreetMap)
- **Routing / geocoding:** OpenRouteService (free key), with keyless OpenStreetMap
  (Nominatim + OSRM) fallbacks so the app works even without an API key.
- **Installable PWA:** web app manifest + a hand-written service worker that
  precaches the app shell and caches map tiles, so the app is installable to a
  home screen and keeps working offline (API calls always go to the network).

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
             ── GET  /api/geocode/suggest/    ├─ geo.py   (geocode + autocomplete + truck routing)
                                              └─ hos.py   (HOS simulation -> segments -> daily logs)
        <── route geometry, stops, per-day log sheets (JSON) ──┘
```

### Project structure

```
backend/
  config/            # Django project (settings, urls, wsgi)
  trips/
    services/
      geo.py         # geocoding, autocomplete, routing (ORS + OSM fallbacks)
      hos.py         # Hours-of-Service engine
    views.py         # API endpoints (throttled)
    tests.py         # HOS unit tests
frontend/
  src/
    app/               # App shell (App.tsx, AppHeader, AppFooter)
    features/
      trip-planner/    # Trip form, map, logs, hooks
    components/        # Shared UI (AddressAutocomplete, ErrorBoundary)
    lib/               # api client, route math, constants, canvas drawing
    types/             # Shared TypeScript types
vercel.json          # Vercel Services config (frontend + backend in one project)
render.yaml          # alternative: backend-only deploy on Render
```

Each component lives in its own folder with an `index.ts` barrel, so per-component
styles (`Component.module.css`) and tests (`Component.test.tsx`) can be colocated.

## Testing

```bash
# Backend (HOS engine)
cd backend && python manage.py test trips

# Frontend (Jest + React Testing Library)
cd frontend && npm test
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
cp .env.example .env            # leave VITE_API_BASE_URL empty to use the dev proxy
npm run dev                     # http://localhost:5173
```

Alternatively, leave `VITE_API_BASE_URL` empty to use the Vite dev proxy
(`/api` → `localhost:8000`), which mirrors the same-origin production setup.

The service worker is only registered in production builds (so it never caches
stale code during development). To test the installable PWA locally:

```bash
npm run build && npm run preview   # http://localhost:4173
```

App icons are generated from `public/app-icon.svg` with
`npm run generate-pwa-assets`; commit the resulting PNGs in `public/`.

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
| `VITE_API_BASE_URL` | Base URL of the Django API. Leave empty for same-origin (`/api`) deploys or the Vite dev proxy. |

## Deployment

### Primary: both services on Vercel (one project)

The repo's root [`vercel.json`](vercel.json) uses Vercel **Services** to deploy the
Vite frontend at `/` and the Django backend at `/api` in a single project — same
origin, so no CORS needed.

1. Push this repo to GitHub.
2. On Vercel: **New Project**, import the repo. Keep **Root Directory** at the repo
   root (not `frontend`). Set the framework preset to **Services** if offered.
3. Add environment variables:
   - `ORS_API_KEY` — OpenRouteService key (recommended for accurate routing)
   - `DJANGO_DEBUG` = `False`
   - `DJANGO_SECRET_KEY` = a long random string
   - `VITE_API_BASE_URL` = *(empty)* so the frontend calls `/api` on the same origin
4. Deploy.

### Alternative: backend on Render

The repo also includes [`render.yaml`](render.yaml) and [`backend/build.sh`](backend/build.sh)
for deploying just the backend on Render (with the frontend on Vercel pointing
`VITE_API_BASE_URL` at the Render URL). `*.vercel.app` origins are allowed by the
backend's CORS regex.

## Notes & limitations

- Without `ORS_API_KEY`, geocoding uses Nominatim and routing uses OSRM; if both
  are unavailable the app shows a straight-line estimate (flagged in the UI).
- Times are clock times starting at 08:00 on the first day for a clean log grid.
- For planning/demonstration only — not an official record of duty status.
