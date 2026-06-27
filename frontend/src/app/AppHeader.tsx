export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            ◷
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">ELD Trip Planner</h1>
            <p className="text-xs text-slate-500">HOS-compliant routing & daily log sheets</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
          Property carrier · 70 hr / 8 day
        </span>
      </div>
    </header>
  );
}
