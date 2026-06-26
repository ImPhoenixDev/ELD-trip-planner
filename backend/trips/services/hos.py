"""Hours-of-Service (HOS) planning engine.

Pure-python, network-free simulation of an FMCSA-compliant trip for a
property-carrying driver operating on the 70-hour / 8-day cycle.

Rules encoded (no adverse driving conditions assumed):
- 11-hour driving limit within a duty period.
- 14-hour on-duty window (does not pause; resets only after 10h off-duty).
- 30-minute break required before driving again after 8 cumulative hours of
  driving. Any non-driving period of >= 30 minutes satisfies this (per the
  2020 rule, on-duty-not-driving counts), so fuel/pickup stops can count.
- 70 hours of on-duty time across a rolling 8-day cycle. When exhausted the
  driver takes a 34-hour restart.
- 10 consecutive hours off-duty resets the daily driving/window clocks.
- 1 hour on-duty (not driving) for pickup and for drop-off.
- Fuel stop (30 min on-duty) at least every 1,000 miles.

The engine produces a flat list of duty segments which are then sliced into
24-hour calendar days for the ELD log sheets.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

# --- Duty statuses (the four ELD grid rows) ---
OFF_DUTY = "off_duty"
SLEEPER = "sleeper"
DRIVING = "driving"
ON_DUTY = "on_duty"

# --- Regulation constants (minutes / miles) ---
DRIVE_LIMIT = 11 * 60
WINDOW_LIMIT = 14 * 60
BREAK_AFTER = 8 * 60
BREAK_DURATION = 30
DAILY_RESET = 10 * 60
CYCLE_LIMIT = 70 * 60
CYCLE_RESTART = 34 * 60

FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION = 30
PICKUP_DURATION = 60
DROPOFF_DURATION = 60

EPS = 1e-6


@dataclass
class Segment:
    status: str
    start_min: float  # minutes from trip start
    end_min: float
    label: str
    start_miles: float
    end_miles: float
    kind: str = "drive"  # drive | pickup | dropoff | fuel | break | rest | restart

    @property
    def duration(self) -> float:
        return self.end_min - self.start_min


class HOSPlanner:
    def __init__(
        self,
        total_miles: float,
        total_drive_minutes: float,
        leg_a_miles: float,
        current_cycle_hours: float,
        start_dt: datetime,
    ):
        self.total_miles = max(total_miles, 0.0)
        self.total_drive_minutes = max(total_drive_minutes, 0.0)
        self.leg_a_miles = min(max(leg_a_miles, 0.0), self.total_miles)
        self.start_dt = start_dt

        # Mutable clocks (all in minutes)
        self.clock = 0.0
        self.miles = 0.0
        self.driving_today = 0.0
        self.driving_since_break = 0.0
        self.cycle_used = max(current_cycle_hours, 0.0) * 60
        self.window_start: Optional[float] = None  # when current 14h window opened

        self.segments: List[Segment] = []

    # ------------------------------------------------------------------ #
    # Clock helpers
    # ------------------------------------------------------------------ #
    def window_used(self) -> float:
        if self.window_start is None:
            return 0.0
        return self.clock - self.window_start

    def _open_window(self) -> None:
        if self.window_start is None:
            self.window_start = self.clock

    def miles_to_minutes(self, miles: float) -> float:
        if self.total_miles <= EPS:
            return 0.0
        return miles / self.total_miles * self.total_drive_minutes

    # ------------------------------------------------------------------ #
    # Segment emitters
    # ------------------------------------------------------------------ #
    def _drive(self, minutes: float, miles: float) -> None:
        self._open_window()
        start_miles = self.miles
        self.clock += minutes
        self.miles += miles
        self.driving_today += minutes
        self.driving_since_break += minutes
        self.cycle_used += minutes
        self.segments.append(
            Segment(DRIVING, self.clock - minutes, self.clock, "Driving", start_miles, self.miles, "drive")
        )

    def _on_duty(self, minutes: float, label: str, kind: str) -> None:
        self._open_window()
        self.clock += minutes
        self.cycle_used += minutes
        self.segments.append(
            Segment(ON_DUTY, self.clock - minutes, self.clock, label, self.miles, self.miles, kind)
        )

    def _rest(self, minutes: float, label: str, kind: str, status: str = OFF_DUTY) -> None:
        start = self.clock
        self.clock += minutes
        self.segments.append(Segment(status, start, self.clock, label, self.miles, self.miles, kind))
        if kind == "break":
            self.driving_since_break = 0.0
        elif kind == "rest":  # 10-hour reset
            self.driving_today = 0.0
            self.driving_since_break = 0.0
            self.window_start = None
        elif kind == "restart":  # 34-hour restart
            self.driving_today = 0.0
            self.driving_since_break = 0.0
            self.cycle_used = 0.0
            self.window_start = None

    # ------------------------------------------------------------------ #
    # Rest decision
    # ------------------------------------------------------------------ #
    def _take_required_rest(self) -> None:
        if self.cycle_used >= CYCLE_LIMIT - EPS:
            self._rest(CYCLE_RESTART, "34-hour cycle restart", "restart")
        elif self.driving_today >= DRIVE_LIMIT - EPS or self.window_used() >= WINDOW_LIMIT - EPS:
            self._rest(DAILY_RESET, "10-hour rest", "rest", status=SLEEPER)
        elif self.driving_since_break >= BREAK_AFTER - EPS:
            self._rest(BREAK_DURATION, "30-minute break", "break")
        else:
            # Defensive fallback; should not happen.
            self._rest(DAILY_RESET, "10-hour rest", "rest", status=SLEEPER)

    # ------------------------------------------------------------------ #
    # Driving with HOS limits
    # ------------------------------------------------------------------ #
    def drive_distance(self, minutes: float, miles: float) -> None:
        if minutes <= EPS:
            if miles > EPS:
                self.miles += miles  # negligible distance, no time
            return
        miles_per_min = miles / minutes
        remaining = minutes
        guard = 0
        while remaining > EPS:
            guard += 1
            if guard > 200000:
                raise RuntimeError("HOS planner failed to converge")
            self._open_window()
            avail = min(
                DRIVE_LIMIT - self.driving_today,
                WINDOW_LIMIT - self.window_used(),
                BREAK_AFTER - self.driving_since_break,
                CYCLE_LIMIT - self.cycle_used,
            )
            if avail <= EPS:
                self._take_required_rest()
                continue
            chunk = min(remaining, avail)
            self._drive(chunk, chunk * miles_per_min)
            remaining -= chunk

    def on_duty_event(self, minutes: float, label: str, kind: str) -> None:
        remaining = minutes
        guard = 0
        while remaining > EPS:
            guard += 1
            if guard > 200000:
                raise RuntimeError("HOS planner failed to converge")
            self._open_window()
            avail = min(WINDOW_LIMIT - self.window_used(), CYCLE_LIMIT - self.cycle_used)
            if avail <= EPS:
                if self.cycle_used >= CYCLE_LIMIT - EPS:
                    self._rest(CYCLE_RESTART, "34-hour cycle restart", "restart")
                else:
                    self._rest(DAILY_RESET, "10-hour rest", "rest", status=SLEEPER)
                continue
            chunk = min(remaining, avail)
            self._on_duty(chunk, label, kind)
            remaining -= chunk
        # A non-driving period of >= 30 min satisfies the 30-minute break rule.
        if minutes >= BREAK_DURATION - EPS:
            self.driving_since_break = 0.0

    # ------------------------------------------------------------------ #
    # Build the trip
    # ------------------------------------------------------------------ #
    def plan(self) -> None:
        milestones = [(self.leg_a_miles, "Pickup", PICKUP_DURATION, "pickup")]
        fuel = FUEL_INTERVAL_MILES
        while fuel < self.total_miles - EPS:
            milestones.append((fuel, "Fuel stop", FUEL_DURATION, "fuel"))
            fuel += FUEL_INTERVAL_MILES
        milestones.sort(key=lambda m: m[0])

        cursor = 0.0
        for mile, label, dur, kind in milestones:
            seg_miles = mile - cursor
            self.drive_distance(self.miles_to_minutes(seg_miles), seg_miles)
            self.on_duty_event(dur, label, kind)
            cursor = mile

        seg_miles = self.total_miles - cursor
        self.drive_distance(self.miles_to_minutes(seg_miles), seg_miles)
        self.on_duty_event(DROPOFF_DURATION, "Drop-off", "dropoff")


# ---------------------------------------------------------------------- #
# Serialization helpers
# ---------------------------------------------------------------------- #
def _dt(start_dt: datetime, minutes: float) -> datetime:
    return start_dt + timedelta(minutes=minutes)


def _fmt_clock(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def build_logs(segments: List[Segment], start_dt: datetime, current_cycle_hours: float = 0.0) -> List[dict]:
    """Slice segments into per-day ELD log sheets (midnight to midnight)."""
    if not segments:
        return []

    # Split every segment at midnight boundaries.
    pieces = []  # (status, start_dt, end_dt, label, kind, start_miles, end_miles)
    for seg in segments:
        s_dt = _dt(start_dt, seg.start_min)
        e_dt = _dt(start_dt, seg.end_min)
        cur = s_dt
        total = (e_dt - s_dt).total_seconds()
        while cur < e_dt:
            next_midnight = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            chunk_end = min(e_dt, next_midnight)
            # Interpolate miles across the chunk.
            if total > 0:
                f0 = (cur - s_dt).total_seconds() / total
                f1 = (chunk_end - s_dt).total_seconds() / total
            else:
                f0 = f1 = 0.0
            pieces.append(
                (
                    seg.status,
                    cur,
                    chunk_end,
                    seg.label,
                    seg.kind,
                    seg.start_miles + (seg.end_miles - seg.start_miles) * f0,
                    seg.start_miles + (seg.end_miles - seg.start_miles) * f1,
                )
            )
            cur = chunk_end

    first_day = segments[0].start_min
    last_day = segments[-1].end_min
    start_date = _dt(start_dt, first_day).date()
    end_date = _dt(start_dt, last_day - EPS).date()

    logs = []
    day = start_date
    day_index = 1
    cycle_running = max(current_cycle_hours, 0.0)  # rolling 70hr/8day on-duty total
    last_miles = 0.0
    while day <= end_date:
        day_start = datetime.combine(day, datetime.min.time())
        day_pieces = [p for p in pieces if p[1].date() == day]

        entries = []
        remarks = []
        totals = {OFF_DUTY: 0.0, SLEEPER: 0.0, DRIVING: 0.0, ON_DUTY: 0.0}
        miles_today = 0.0

        cursor_min = 0  # minutes from midnight
        prev_status = None
        for status, s_dt, e_dt, label, kind, sm, em in sorted(day_pieces, key=lambda p: p[1]):
            start_m = int(round((s_dt - day_start).total_seconds() / 60))
            end_m = int(round((e_dt - day_start).total_seconds() / 60))
            if start_m > cursor_min:
                entries.append({"status": OFF_DUTY, "start": cursor_min, "end": start_m})
                totals[OFF_DUTY] += (start_m - cursor_min) / 60.0
            entries.append({"status": status, "start": start_m, "end": end_m})
            totals[status] += (end_m - start_m) / 60.0
            if status == DRIVING:
                miles_today += em - sm
            # FMCSA requires a remark at every change of duty status.
            if status != prev_status:
                remarks.append(
                    {
                        "time": s_dt.isoformat(),
                        "clock": _fmt_clock(s_dt),
                        "status": status,
                        "label": label,
                        "kind": kind,
                        "miles": round(sm, 1),
                    }
                )
            prev_status = status
            cursor_min = max(cursor_min, end_m)

        if cursor_min < 24 * 60:
            entries.append({"status": OFF_DUTY, "start": cursor_min, "end": 24 * 60})
            totals[OFF_DUTY] += (24 * 60 - cursor_min) / 60.0

        # Day start/end mileage (for the From/To fields).
        if day_pieces:
            ordered = sorted(day_pieces, key=lambda p: p[1])
            day_start_miles = ordered[0][5]
            day_end_miles = ordered[-1][6]
        else:
            day_start_miles = day_end_miles = last_miles
        last_miles = day_end_miles

        # Recap: rolling 70-hour / 8-day on-duty total and hours available tomorrow.
        on_duty_today = totals[ON_DUTY] + totals[DRIVING]
        restart_pieces = [p for p in day_pieces if p[4] == "restart"]
        if restart_pieces:
            # A 34-hour restart zeroes the cycle; only on-duty time after it counts.
            restart_end = max(p[2] for p in restart_pieces)
            cycle_running = sum(
                (p[2] - p[1]).total_seconds() / 3600.0
                for p in day_pieces
                if p[0] in (DRIVING, ON_DUTY) and p[1] >= restart_end
            )
        else:
            cycle_running += on_duty_today
        available_tomorrow = max(0.0, CYCLE_LIMIT / 60.0 - cycle_running)

        logs.append(
            {
                "day": day_index,
                "date": day.isoformat(),
                "entries": entries,
                "totals": {k: round(v, 2) for k, v in totals.items()},
                "total_on_duty": round(on_duty_today, 2),
                "remarks": remarks,
                "miles": round(miles_today, 1),
                "start_miles": round(day_start_miles, 1),
                "end_miles": round(day_end_miles, 1),
                "recap": {
                    "on_duty_today": round(on_duty_today, 2),
                    "total_on_duty_8day": round(cycle_running, 2),
                    "available_tomorrow": round(available_tomorrow, 2),
                },
            }
        )
        day = day + timedelta(days=1)
        day_index += 1

    return logs


def _stop_coords_note(seg: Segment) -> dict:
    return {
        "kind": seg.kind,
        "label": seg.label,
        "miles": round(seg.start_miles, 1),
        "duration_min": int(round(seg.duration)),
    }


def plan_trip(
    total_miles: float,
    total_drive_minutes: float,
    leg_a_miles: float,
    current_cycle_hours: float,
    start_dt: Optional[datetime] = None,
) -> dict:
    """Run the full HOS simulation and return a JSON-serializable result."""
    if start_dt is None:
        start_dt = datetime.combine(datetime.now().date(), datetime.min.time()) + timedelta(hours=8)

    planner = HOSPlanner(
        total_miles=total_miles,
        total_drive_minutes=total_drive_minutes,
        leg_a_miles=leg_a_miles,
        current_cycle_hours=current_cycle_hours,
        start_dt=start_dt,
    )
    planner.plan()

    segments_out = []
    for seg in planner.segments:
        segments_out.append(
            {
                "status": seg.status,
                "kind": seg.kind,
                "label": seg.label,
                "start": _dt(start_dt, seg.start_min).isoformat(),
                "end": _dt(start_dt, seg.end_min).isoformat(),
                "start_minute": round(seg.start_min, 2),
                "end_minute": round(seg.end_min, 2),
                "duration_min": round(seg.duration, 2),
                "start_miles": round(seg.start_miles, 1),
                "end_miles": round(seg.end_miles, 1),
            }
        )

    stops = []
    for seg in planner.segments:
        if seg.kind in {"pickup", "dropoff", "fuel", "break", "rest", "restart"}:
            stops.append(
                {
                    **_stop_coords_note(seg),
                    "time": _dt(start_dt, seg.start_min).isoformat(),
                }
            )

    logs = build_logs(planner.segments, start_dt, current_cycle_hours)

    total_drive_hours = round(planner.total_drive_minutes / 60.0, 2)
    total_on_duty_min = sum(s.duration for s in planner.segments if s.status in {DRIVING, ON_DUTY})
    total_duration_min = planner.clock

    return {
        "summary": {
            "total_miles": round(planner.total_miles, 1),
            "total_drive_hours": total_drive_hours,
            "total_on_duty_hours": round(total_on_duty_min / 60.0, 2),
            "total_trip_hours": round(total_duration_min / 60.0, 2),
            "num_days": len(logs),
            "num_fuel_stops": sum(1 for s in stops if s["kind"] == "fuel"),
            "num_rests": sum(1 for s in stops if s["kind"] in {"rest", "restart"}),
            "cycle_hours_start": round(current_cycle_hours, 2),
            "cycle_hours_end": round(planner.cycle_used / 60.0, 2),
            "start_time": start_dt.isoformat(),
            "end_time": _dt(start_dt, total_duration_min).isoformat(),
        },
        "segments": segments_out,
        "stops": stops,
        "logs": logs,
    }
