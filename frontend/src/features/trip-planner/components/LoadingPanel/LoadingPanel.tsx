export default function LoadingPanel() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
        <p className="text-sm">Calculating route and hours of service…</p>
      </div>
    </div>
  );
}
