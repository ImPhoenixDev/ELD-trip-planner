import { useState } from "react";

const EXAMPLES = [
  {
    name: "Long haul (multi-day)",
    values: {
      current_location: "Los Angeles, CA",
      pickup_location: "Phoenix, AZ",
      dropoff_location: "Dallas, TX",
      current_cycle_used: "8",
    },
  },
  {
    name: "Cross-country",
    values: {
      current_location: "Seattle, WA",
      pickup_location: "Denver, CO",
      dropoff_location: "New York, NY",
      current_cycle_used: "20",
    },
  },
  {
    name: "Short regional",
    values: {
      current_location: "Chicago, IL",
      pickup_location: "Milwaukee, WI",
      dropoff_location: "Indianapolis, IN",
      current_cycle_used: "2",
    },
  },
];

const EMPTY = {
  current_location: "",
  pickup_location: "",
  dropoff_location: "",
  current_cycle_used: "",
};

const FIELDS = [
  { key: "current_location", label: "Current location", placeholder: "City, State" },
  { key: "pickup_location", label: "Pickup location", placeholder: "City, State" },
  { key: "dropoff_location", label: "Drop-off location", placeholder: "City, State" },
];

export default function TripForm({ onSubmit, loading, fieldErrors }) {
  const [values, setValues] = useState(EMPTY);

  const update = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...values,
      current_cycle_used: values.current_cycle_used === "" ? 0 : Number(values.current_cycle_used),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="field-label" htmlFor={f.key}>
            {f.label}
          </label>
          <input
            id={f.key}
            className="field-input"
            placeholder={f.placeholder}
            value={values[f.key]}
            onChange={update(f.key)}
            autoComplete="off"
          />
          {fieldErrors?.[f.key] && <p className="mt-1 text-xs text-red-600">{fieldErrors[f.key]}</p>}
        </div>
      ))}

      <div>
        <label className="field-label" htmlFor="current_cycle_used">
          Current cycle used <span className="font-normal text-slate-400">(hrs of 70)</span>
        </label>
        <input
          id="current_cycle_used"
          className="field-input"
          type="number"
          min="0"
          max="70"
          step="0.5"
          placeholder="0"
          value={values.current_cycle_used}
          onChange={update("current_cycle_used")}
        />
        {fieldErrors?.current_cycle_used && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.current_cycle_used}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5
          text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700
          focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Planning route…
          </>
        ) : (
          "Plan trip & generate logs"
        )}
      </button>

      <div className="pt-1">
        <p className="mb-2 text-xs font-medium text-slate-500">Try an example</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              type="button"
              onClick={() => setValues({ ...EMPTY, ...ex.values })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium
                text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
