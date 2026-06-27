import { useEffect, useRef } from 'react';
import { drawLogSheet, LOG_SHEET_WIDTH } from '../../../../lib/log-sheet-draw';
import type { DailyLog } from '../../../../types/trip';
import { LogSheetHeader } from './LogSheetHeader';
import { LogSheetRemarks } from './LogSheetRemarks';
import { LogSheetRecap } from './LogSheetRecap';
import { LogSheetFooter } from './LogSheetFooter';

interface LogSheetProps {
  log: DailyLog;
}

export default function LogSheet({ log }: LogSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalMiles = log.miles ?? 0;

  useEffect(() => {
    if (canvasRef.current) drawLogSheet(canvasRef.current, log);
  }, [log]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <LogSheetHeader log={log} totalMiles={totalMiles} />

      <div className="w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', maxWidth: `${LOG_SHEET_WIDTH}px`, height: 'auto', display: 'block' }}
          aria-label={`ELD log grid for day ${log.day}`}
        />
      </div>

      <LogSheetRemarks remarks={log.remarks} />
      <LogSheetRecap recap={log.recap} />
      <LogSheetFooter totals={log.totals} />
    </div>
  );
}
