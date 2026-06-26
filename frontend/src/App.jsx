import { useState } from "react";
import TripForm from "./components/TripForm";
import MapView from "./components/MapView";
import LogSheet from "./components/LogSheet";
import Summary from "./components/Summary";
import { STATUS_ROWS } from "./lib/constants";
import { planTrip } from "./lib/api";

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {STATUS_ROWS.map((r) => (
        <span key={r.key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
          {r.label}
        </span>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
        🗺️
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Plan a compliant trip</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Enter your current location, pickup and drop-off, and the hours already used in your 70-hour
        cycle. We'll map the route and draw your daily ELD log sheets.
      </p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    setFieldErrors(null);
    try {
      const result = await planTrip(payload);
      setData(result);
    } catch (err) {
      setError(err.message);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              ◷
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900">ELD Trip Planner</h1>
              <p className="text-xs text-slate-500">HOS-compliant routing & daily log sheets</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
            Property carrier · 70 hr / 8 day
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Trip details</h2>
              <TripForm onSubmit={handleSubmit} loading={loading} fieldErrors={fieldErrors} />
            </div>

            {data && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Trip summary</h2>
                <Summary data={data} />
              </div>
            )}
          </div>

          {/* Main panel */}
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!data && !loading && <EmptyState />}

            {loading && !data && (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
                  <p className="text-sm">Calculating route and hours of service…</p>
                </div>
              </div>
            )}

            {data && (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                  <div className="h-[380px] sm:h-[440px]">
                    <MapView data={data} />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Daily log sheets
                      <span className="ml-2 font-normal text-slate-500">
                        {data.logs.length} day{data.logs.length > 1 ? "s" : ""}
                      </span>
                    </h2>
                    <Legend />
                  </div>
                  <div className="space-y-4">
                    {data.logs.map((log) => (
                      <LogSheet key={log.day} log={log} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          Routing & geocoding via OpenRouteService / OpenStreetMap. For planning use only — not an
          official record of duty status.
        </footer>
      </main>
    </div>
  );
}
