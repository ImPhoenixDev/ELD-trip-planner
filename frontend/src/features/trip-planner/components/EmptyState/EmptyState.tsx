export default function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
        🗺️
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Plan a compliant trip</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Enter your current location, pickup and drop-off, and the hours already used in your 70-hour
        cycle. We&apos;ll map the route and draw your daily ELD log sheets.
      </p>
    </div>
  );
}
