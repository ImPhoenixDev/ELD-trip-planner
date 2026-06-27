import { useState, type ChangeEvent, type FormEvent } from 'react';
import AddressAutocomplete from '../../../../components/AddressAutocomplete';
import type { FieldErrors, TripFormPayload } from '../../../../types/trip';
import {
  TRIP_FORM_FIELDS,
  EMPTY_TRIP_FORM,
  TRIP_EXAMPLES,
  type TripFormValues,
} from './tripFormConfig';

interface TripFormProps {
  onSubmit: (payload: TripFormPayload) => void;
  loading: boolean;
  fieldErrors?: FieldErrors | null;
}

export default function TripForm({ onSubmit, loading, fieldErrors }: TripFormProps) {
  const [values, setValues] = useState<TripFormValues>(EMPTY_TRIP_FORM);

  const update = (key: keyof TripFormValues) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const setField = (key: keyof TripFormValues) => (val: string) =>
    setValues((v) => ({ ...v, [key]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...values,
      current_cycle_used: values.current_cycle_used === '' ? 0 : Number(values.current_cycle_used),
      start_time: values.start_time || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {TRIP_FORM_FIELDS.map((f) => (
        <AddressAutocomplete
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          value={values[f.key]}
          onChange={setField(f.key)}
          error={fieldErrors?.[f.key]}
        />
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
          onChange={update('current_cycle_used')}
        />
        {fieldErrors?.current_cycle_used && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.current_cycle_used}</p>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="start_time">
          Departure date &amp; time <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="start_time"
          className="field-input"
          type="datetime-local"
          value={values.start_time}
          onChange={update('start_time')}
        />
        <p className="mt-1 text-[11px] text-slate-400">Defaults to 8:00 AM today if left blank.</p>
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
          'Plan trip & generate logs'
        )}
      </button>

      <div className="pt-1">
        <p className="mb-2 text-xs font-medium text-slate-500">Try an example</p>
        <div className="flex flex-wrap gap-2">
          {TRIP_EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              type="button"
              onClick={() => setValues({ ...EMPTY_TRIP_FORM, ...ex.values })}
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
