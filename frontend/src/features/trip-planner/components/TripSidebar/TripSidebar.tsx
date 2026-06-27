import type { FieldErrors, TripFormPayload, TripPlanResponse } from '../../../../types/trip';
import TripForm from '../TripForm';
import Summary from '../Summary';

interface TripSidebarProps {
  data: TripPlanResponse | null;
  loading: boolean;
  fieldErrors: FieldErrors | null;
  submitTrip: (payload: TripFormPayload) => void;
}

export default function TripSidebar({ data, loading, fieldErrors, submitTrip }: TripSidebarProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Trip details</h2>
        <TripForm onSubmit={submitTrip} loading={loading} fieldErrors={fieldErrors} />
      </div>

      {data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Trip summary</h2>
          <Summary data={data} />
        </div>
      )}
    </div>
  );
}
