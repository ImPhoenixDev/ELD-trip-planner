import { useEffect, useRef } from "react";
import { STATUS_ROWS, STATUS_INDEX, fmtDate } from "../lib/constants";

const STATUS_COLOR = Object.fromEntries(STATUS_ROWS.map((r) => [r.key, r.color]));

// Fixed internal drawing resolution; the canvas scales responsively via CSS.
const W = 920;
const GRID_LEFT = 118;
const GRID_RIGHT = W - 64;
const GRID_TOP = 34;
const ROW_H = 34;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const HOUR_W = GRID_W / 24;
const H = GRID_TOP + ROW_H * 4 + 26;

function hourLabel(h) {
  if (h === 0 || h === 24) return "M";
  if (h === 12) return "N";
  return String(h % 12 === 0 ? 12 : h % 12);
}

function xForMinutes(min) {
  return GRID_LEFT + (min / 1440) * GRID_W;
}

function rowCenter(statusKey) {
  return GRID_TOP + STATUS_INDEX[statusKey] * ROW_H + ROW_H / 2;
}

function drawSheet(canvas, log) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.font = "11px Inter, sans-serif";
  ctx.textBaseline = "middle";

  // Hour labels (top)
  ctx.fillStyle = "#475569";
  ctx.textAlign = "center";
  for (let h = 0; h <= 24; h++) {
    ctx.fillText(hourLabel(h), xForMinutes(h * 60), GRID_TOP - 16);
  }

  // Vertical hour + quarter lines
  for (let h = 0; h <= 24; h++) {
    const x = xForMinutes(h * 60);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + ROW_H * 4);
    ctx.stroke();

    if (h < 24) {
      for (let q = 1; q < 4; q++) {
        const qx = x + (q / 4) * HOUR_W;
        ctx.strokeStyle = "#e2e8f0";
        for (let r = 0; r < 4; r++) {
          const top = GRID_TOP + r * ROW_H;
          const tickLen = q === 2 ? ROW_H * 0.32 : ROW_H * 0.18;
          ctx.beginPath();
          ctx.moveTo(qx, top);
          ctx.lineTo(qx, top + tickLen);
          ctx.moveTo(qx, top + ROW_H);
          ctx.lineTo(qx, top + ROW_H - tickLen);
          ctx.stroke();
        }
      }
    }
  }

  // Row separators + labels + totals
  STATUS_ROWS.forEach((row, i) => {
    const top = GRID_TOP + i * ROW_H;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, top);
    ctx.lineTo(GRID_RIGHT, top);
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillText(row.label, 8, top + ROW_H / 2);

    const hours = log.totals[row.key] || 0;
    ctx.textAlign = "right";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(hours.toFixed(2), W - 8, top + ROW_H / 2);
    ctx.font = "11px Inter, sans-serif";
  });
  // bottom border
  ctx.strokeStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(GRID_LEFT, GRID_TOP + ROW_H * 4);
  ctx.lineTo(GRID_RIGHT, GRID_TOP + ROW_H * 4);
  ctx.stroke();

  // Totals header
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "right";
  ctx.font = "600 10px Inter, sans-serif";
  ctx.fillText("Hrs", W - 8, GRID_TOP - 16);

  // Duty step line
  const entries = log.entries || [];
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  let prevY = null;
  entries.forEach((e) => {
    const y = rowCenter(e.status);
    const x0 = xForMinutes(e.start);
    const x1 = xForMinutes(e.end);
    if (prevY !== null && prevY !== y) {
      ctx.lineTo(x0, prevY);
      ctx.lineTo(x0, y);
    } else if (prevY === null) {
      ctx.moveTo(x0, y);
    }
    ctx.lineTo(x1, y);
    prevY = y;
  });
  ctx.stroke();
}

export default function LogSheet({ log }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) drawSheet(canvasRef.current, log);
  }, [log]);

  const totalMiles = log.miles ?? 0;
  const t = log.totals || {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      {/* Official RODS header block */}
      <div className="mb-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              Driver's Daily Log
            </h3>
            <p className="text-[11px] text-slate-500">
              One calendar day — 24 hours · U.S. Department of Transportation
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900">
              Day {log.day} · {fmtDate(log.date)}
            </div>
            <div className="text-[11px] text-slate-500">Time base: home terminal</div>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
          <Field label="Total miles driving today" value={`${totalMiles.toLocaleString()} mi`} />
          <Field label="Total on-duty" value={`${log.total_on_duty?.toFixed(2)} h`} />
          <Field label="Carrier" value="" />
          <Field label="Main office address" value="" />
          <Field label="Truck / tractor & trailer no." value="" />
          <Field label="Shipping doc no. / commodity" value="" />
          <Field label="Co-driver" value="None" />
          <Field label="24-hour period starting time" value="Midnight (00:00)" />
        </dl>
      </div>

      <div className="w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", maxWidth: `${W}px`, height: "auto", display: "block" }}
          aria-label={`ELD log grid for day ${log.day}`}
        />
      </div>

      {log.remarks?.length > 0 && (
        <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Remarks <span className="font-normal normal-case text-slate-400">(location at each duty change)</span>
          </p>
          <ul className="space-y-1">
            {log.remarks.map((r, idx) => (
              <li key={idx} className="flex items-baseline gap-2 text-xs text-slate-700">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLOR[r.status] || "#64748b" }}
                />
                <span className="w-16 shrink-0 font-mono text-slate-500">{r.clock}</span>
                <span className="font-medium text-slate-800">{r.location || "—"}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <span>I certify that these entries are true and correct.</span>
        <span className="min-w-[160px] flex-1 border-b border-slate-300 text-right text-slate-400">
          Driver's signature
        </span>
        <span className="font-mono text-slate-600">
          Total: {(t.off_duty + t.sleeper + t.driving + t.on_duty).toFixed(2)} = 24.00 h
        </span>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="border-b border-slate-200 pb-0.5 font-medium text-slate-800">
        {value || <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}
