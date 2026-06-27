import type { DutyStatus } from '../../../../types/trip';

interface LogSheetFooterProps {
  totals: Record<DutyStatus, number>;
}

export function LogSheetFooter({ totals }: LogSheetFooterProps) {
  const t = totals || {};
  const dayTotal = (t.off_duty ?? 0) + (t.sleeper ?? 0) + (t.driving ?? 0) + (t.on_duty ?? 0);

  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
      <span>I certify that these entries are true and correct.</span>
      <span className="min-w-[160px] flex-1 border-b border-slate-300 text-right text-slate-400">
        Driver&apos;s signature
      </span>
      <span className="font-mono text-slate-600">Total: {dayTotal.toFixed(2)} = 24.00 h</span>
    </div>
  );
}
