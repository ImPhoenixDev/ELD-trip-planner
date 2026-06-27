interface LogSheetFieldProps {
  label: string;
  value?: string;
}

export function LogSheetField({ label, value }: LogSheetFieldProps) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="border-b border-slate-200 pb-0.5 font-medium text-slate-800">
        {value || <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}
