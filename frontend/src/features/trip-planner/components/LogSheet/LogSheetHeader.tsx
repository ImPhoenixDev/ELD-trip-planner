import { fmtDate } from '../../../../lib/constants';
import type { DailyLog } from '../../../../types/trip';
import { LogSheetField } from './LogSheetField';

interface LogSheetHeaderProps {
  log: DailyLog;
  totalMiles: number;
}

export function LogSheetHeader({ log, totalMiles }: LogSheetHeaderProps) {
  return (
    <div className="mb-3 border-b border-slate-200 pb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Driver&apos;s Daily Log
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

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        <LogSheetField label="From" value={log.from_location} />
        <LogSheetField label="To" value={log.to_location} />
      </dl>

      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
        <LogSheetField label="Total miles driving today" value={`${totalMiles.toLocaleString()} mi`} />
        <LogSheetField label="Total mileage today" value={`${totalMiles.toLocaleString()} mi`} />
        <LogSheetField label="Total on-duty" value={`${log.total_on_duty?.toFixed(2)} h`} />
        <LogSheetField label="Carrier" value="" />
        <LogSheetField label="Main office address" value="" />
        <LogSheetField label="Home terminal address" value="" />
        <LogSheetField label="Truck / tractor & trailer no." value="" />
        <LogSheetField label="Co-driver" value="None" />
        <LogSheetField label="DVL / manifest no." value="" />
        <LogSheetField label="Shipper & commodity" value="" />
        <LogSheetField label="24-hour period starting time" value="Midnight (00:00)" />
      </dl>
    </div>
  );
}
