export const TRIP_FORM_FIELDS = [
  { key: 'current_location' as const, label: 'Current location', placeholder: 'City, State' },
  { key: 'pickup_location' as const, label: 'Pickup location', placeholder: 'City, State' },
  { key: 'dropoff_location' as const, label: 'Drop-off location', placeholder: 'City, State' },
];

export type TripFormFieldKey = (typeof TRIP_FORM_FIELDS)[number]['key'];

export interface TripFormValues {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: string;
  start_time: string;
}

export const EMPTY_TRIP_FORM: TripFormValues = {
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: '',
  start_time: '',
};

export const TRIP_EXAMPLES: { name: string; values: Partial<TripFormValues> }[] = [
  {
    name: 'Long haul (multi-day)',
    values: {
      current_location: 'Los Angeles, CA',
      pickup_location: 'Phoenix, AZ',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: '8',
    },
  },
  {
    name: 'Cross-country',
    values: {
      current_location: 'Seattle, WA',
      pickup_location: 'Denver, CO',
      dropoff_location: 'New York, NY',
      current_cycle_used: '20',
    },
  },
  {
    name: 'Short regional',
    values: {
      current_location: 'Chicago, IL',
      pickup_location: 'Milwaukee, WI',
      dropoff_location: 'Indianapolis, IN',
      current_cycle_used: '2',
    },
  },
];
