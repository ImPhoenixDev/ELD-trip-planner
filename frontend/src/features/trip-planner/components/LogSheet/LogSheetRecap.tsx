import type { LogRecap } from '../../../../types/trip';

interface RecapStatProps {
  label: string;
  value?: number;
}

function RecapStat({ label, value }: RecapStatProps) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <div className="text-sm font-bold text-slate-900">{(value ?? 0).toFixed(2)} h</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

interface LogSheetRecapProps {
  recap?: LogRecap;
}

export function LogSheetRecap({ recap }: LogSheetRecapProps) {
  if (!recap) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recap <span className="font-normal normal-case text-slate-400">(70 hr / 8 day cycle)</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        <RecapStat label="On duty today" value={recap.on_duty_today} />
        <RecapStat label="Total last 8 days" value={recap.total_on_duty_8day} />
        <RecapStat label="Available tomorrow" value={recap.available_tomorrow} />
      </div>
    </div>
  );
}
