import { useTripPlanner } from '../features/trip-planner/hooks/useTripPlanner';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import TripSidebar from '../features/trip-planner/components/TripSidebar';
import EmptyState from '../features/trip-planner/components/EmptyState';
import LoadingPanel from '../features/trip-planner/components/LoadingPanel';
import TripResults from '../features/trip-planner/components/TripResults';

export default function App() {
  const { data, loading, error, fieldErrors, submitTrip } = useTripPlanner();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <TripSidebar
            data={data}
            loading={loading}
            fieldErrors={fieldErrors}
            submitTrip={submitTrip}
          />

          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!data && !loading && <EmptyState />}
            {loading && !data && <LoadingPanel />}
            {data && <TripResults data={data} />}
          </div>
        </div>

        <AppFooter />
      </main>
    </div>
  );
}
