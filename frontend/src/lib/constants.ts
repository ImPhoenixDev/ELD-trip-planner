import type { DutyStatus, StopKind } from '../types/trip';

export interface StatusRow {
  key: DutyStatus;
  label: string;
  short: string;
  color: string;
}

export interface StopMetaEntry {
  label: string;
  color: string;
  emoji: string;
}

export const STATUS_ROWS: StatusRow[] = [
  { key: 'off_duty', label: 'Off Duty', short: 'OFF', color: '#64748b' },
  { key: 'sleeper', label: 'Sleeper Berth', short: 'SB', color: '#7c3aed' },
  { key: 'driving', label: 'Driving', short: 'D', color: '#2563eb' },
  { key: 'on_duty', label: 'On Duty (not driving)', short: 'ON', color: '#f59e0b' },
];

export const STATUS_INDEX: Record<DutyStatus, number> = Object.fromEntries(
  STATUS_ROWS.map((r, i) => [r.key, i]),
) as Record<DutyStatus, number>;

export const STOP_META: Record<StopKind, StopMetaEntry> = {
  current: { label: 'Start', color: '#0f172a', emoji: 'S' },
  pickup: { label: 'Pickup', color: '#16a34a', emoji: 'P' },
  dropoff: { label: 'Drop-off', color: '#dc2626', emoji: 'D' },
  fuel: { label: 'Fuel', color: '#f59e0b', emoji: 'F' },
  break: { label: '30-min break', color: '#0ea5e9', emoji: 'B' },
  rest: { label: '10-hr rest', color: '#7c3aed', emoji: 'R' },
  restart: { label: '34-hr restart', color: '#9333ea', emoji: 'R' },
};

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
