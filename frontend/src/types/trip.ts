export type DutyStatus = 'off_duty' | 'sleeper' | 'driving' | 'on_duty';

export type StopKind =
  | 'current'
  | 'pickup'
  | 'dropoff'
  | 'fuel'
  | 'break'
  | 'rest'
  | 'restart';

export interface Place {
  lat: number;
  lng: number;
  label: string;
  location?: string;
}

export interface TripFormPayload {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
  start_time?: string;
}

export interface LogRecap {
  on_duty_today: number;
  total_on_duty_8day: number;
  available_tomorrow: number;
}

export interface LogRemark {
  time: string;
  clock: string;
  status: DutyStatus;
  label: string;
  kind: string;
  miles: number;
  location?: string;
}

export interface LogEntry {
  status: DutyStatus;
  start: number;
  end: number;
}

export interface DailyLog {
  day: number;
  date: string;
  entries: LogEntry[];
  totals: Record<DutyStatus, number>;
  total_on_duty: number;
  remarks: LogRemark[];
  miles: number;
  start_miles?: number;
  end_miles?: number;
  from_location?: string;
  to_location?: string;
  recap?: LogRecap;
}

export interface TripStop {
  kind: StopKind;
  label: string;
  miles: number;
  duration_min: number;
  time: string;
  location?: string;
}

export interface TripSummary {
  total_miles: number;
  total_drive_hours: number;
  total_on_duty_hours: number;
  total_trip_hours: number;
  num_days: number;
  num_fuel_stops: number;
  num_rests: number;
  cycle_hours_start: number;
  cycle_hours_end: number;
  start_time: string;
  end_time: string;
}

export interface TripRoute {
  geometry: [number, number][];
  distance_miles: number;
  duration_minutes: number;
  leg_miles: number[];
  approximate?: boolean;
}

export interface TripPlanResponse {
  inputs: TripFormPayload;
  places: {
    current: Place;
    pickup: Place;
    dropoff: Place;
  };
  route: TripRoute;
  summary: TripSummary;
  stops: TripStop[];
  logs: DailyLog[];
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export type FieldErrors = Record<string, string>;

export class TripValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors) {
    super(message);
    this.name = 'TripValidationError';
    this.fieldErrors = fieldErrors;
  }
}
