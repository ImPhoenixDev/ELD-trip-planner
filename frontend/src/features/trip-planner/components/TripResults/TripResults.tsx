import ErrorBoundary from '../../../../components/ErrorBoundary';
import type { TripPlanResponse } from '../../../../types/trip';
import MapView from '../MapView';
import LogSheet from '../LogSheet';
import StatusLegend from '../StatusLegend';

interface TripResultsProps {
  data: TripPlanResponse;
}

export default function TripResults({ data }: TripResultsProps) {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
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
                {data.logs.length} day{data.logs.length > 1 ? 's' : ''}
              </span>
            </h2>
            <StatusLegend />
          </div>
          <div className="space-y-4">
            {data.logs.map((log) => (
              <LogSheet key={log.day} log={log} />
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
