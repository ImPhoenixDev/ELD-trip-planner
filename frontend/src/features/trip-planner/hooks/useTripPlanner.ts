import { useState, useCallback } from 'react';
import { planTrip } from '../../../lib/api';
import { TripValidationError } from '../../../types/trip';
import type { FieldErrors, TripFormPayload, TripPlanResponse } from '../../../types/trip';

export function useTripPlanner() {
  const [data, setData] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);

  const submitTrip = useCallback(async (payload: TripFormPayload) => {
    setLoading(true);
    setError(null);
    setFieldErrors(null);
    try {
      const result = await planTrip(payload);
      setData(result);
    } catch (err) {
      if (err instanceof TripValidationError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else if (err instanceof Error) {
        setError(err.message);
        setFieldErrors(null);
      } else {
        setError('Something went wrong. Please try again.');
        setFieldErrors(null);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fieldErrors, submitTrip };
}
