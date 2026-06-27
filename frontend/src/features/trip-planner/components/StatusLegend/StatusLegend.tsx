import { STATUS_ROWS } from '../../../../lib/constants';

export default function StatusLegend() {
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
