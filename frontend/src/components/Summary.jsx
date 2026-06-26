import { STOP_META, fmtTime } from "../lib/constants";

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Summary({ data }) {
  const s = data.summary;
  const events = (data.stops || []).filter((x) =>
    ["fuel", "break", "rest", "restart"].includes(x.kind)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Total distance" value={`${s.total_miles.toLocaleString()} mi`} />
        <Stat label="Drive time" value={`${s.total_drive_hours} h`} />
        <Stat label="Trip duration" value={`${s.total_trip_hours} h`} sub={`across ${s.num_days} day${s.num_days > 1 ? "s" : ""}`} />
        <Stat label="Cycle used" value={`${s.cycle_hours_end} / 70 h`} sub={`started at ${s.cycle_hours_start} h`} />
      </div>

      {data.route?.approximate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
          Showing an approximate straight-line route (routing service unavailable).
        </p>
      )}

      {events.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Planned stops & rests
          </p>
          <ul className="space-y-1.5">
            {events.map((e, i) => {
              const meta = STOP_META[e.kind] || {};
              return (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                  <span className="font-mono text-xs text-slate-500">{fmtTime(e.time)}</span>
                  <span className="text-slate-700">{meta.label || e.label}</span>
                  <span className="ml-auto text-xs text-slate-400">~{Math.round(e.miles)} mi</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
