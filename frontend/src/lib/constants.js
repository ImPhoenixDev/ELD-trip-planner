// Duty status display metadata (order matters: it defines the grid rows).
export const STATUS_ROWS = [
  { key: "off_duty", label: "Off Duty", short: "OFF", color: "#64748b" },
  { key: "sleeper", label: "Sleeper Berth", short: "SB", color: "#7c3aed" },
  { key: "driving", label: "Driving", short: "D", color: "#2563eb" },
  { key: "on_duty", label: "On Duty (not driving)", short: "ON", color: "#f59e0b" },
];

export const STATUS_INDEX = Object.fromEntries(STATUS_ROWS.map((r, i) => [r.key, i]));

// Stop/marker metadata keyed by the engine's `kind`.
export const STOP_META = {
  current: { label: "Start", color: "#0f172a", emoji: "S" },
  pickup: { label: "Pickup", color: "#16a34a", emoji: "P" },
  dropoff: { label: "Drop-off", color: "#dc2626", emoji: "D" },
  fuel: { label: "Fuel", color: "#f59e0b", emoji: "F" },
  break: { label: "30-min break", color: "#0ea5e9", emoji: "B" },
  rest: { label: "10-hr rest", color: "#7c3aed", emoji: "R" },
  restart: { label: "34-hr restart", color: "#9333ea", emoji: "R" },
};

export function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
