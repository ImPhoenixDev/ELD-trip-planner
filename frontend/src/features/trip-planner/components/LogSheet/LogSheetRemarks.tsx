import { STATUS_ROWS } from '../../../../lib/constants';
import type { LogRemark } from '../../../../types/trip';

const STATUS_COLOR = Object.fromEntries(STATUS_ROWS.map((r) => [r.key, r.color])) as Record<
  string,
  string
>;

interface LogSheetRemarksProps {
  remarks: LogRemark[];
}

export function LogSheetRemarks({ remarks }: LogSheetRemarksProps) {
  if (!remarks?.length) return null;

  return (
    <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Remarks{' '}
        <span className="font-normal normal-case text-slate-400">(location at each duty change)</span>
      </p>
      <ul className="space-y-1">
        {remarks.map((r, idx) => (
          <li key={idx} className="flex items-baseline gap-2 text-xs text-slate-700">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: STATUS_COLOR[r.status] || '#64748b' }}
            />
            <span className="w-16 shrink-0 font-mono text-slate-500">{r.clock}</span>
            <span className="font-medium text-slate-800">{r.location || '—'}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
