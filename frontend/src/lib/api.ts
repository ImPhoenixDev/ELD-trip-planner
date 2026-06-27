import {
  AddressSuggestion,
  TripFormPayload,
  TripPlanResponse,
  TripValidationError,
  FieldErrors,
} from '../types/trip';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export const BASE_URL = RAW_BASE.replace(/\/$/, '');

interface ApiErrorBody {
  errors?: FieldErrors;
  detail?: string;
}

export async function planTrip(payload: TripFormPayload): Promise<TripPlanResponse> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/api/plan-trip/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the planning service. Is the API running?');
  }

  let data: ApiErrorBody | TripPlanResponse | null = null;
  try {
    data = (await resp.json()) as ApiErrorBody | TripPlanResponse;
  } catch {
    /* non-JSON response */
  }

  if (!resp.ok) {
    const body = data as ApiErrorBody | null;
    if (body?.errors) {
      throw new TripValidationError('Please fix the highlighted fields.', body.errors);
    }
    throw new Error(body?.detail || `Request failed (${resp.status}).`);
  }

  return data as TripPlanResponse;
}

export async function suggestPlaces(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const resp = await fetch(`${BASE_URL}/api/geocode/suggest/?q=${encodeURIComponent(q)}`, {
    signal: options.signal,
  });
  if (!resp.ok) return [];
  const data = (await resp.json().catch(() => null)) as { suggestions?: AddressSuggestion[] } | null;
  return data?.suggestions ?? [];
}
