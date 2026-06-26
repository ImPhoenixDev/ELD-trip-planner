"""Unit tests for the HOS planning engine."""

from datetime import datetime

from django.test import SimpleTestCase

from trips.services.hos import (
    BREAK_AFTER,
    CYCLE_LIMIT,
    DRIVE_LIMIT,
    DRIVING,
    ON_DUTY,
    WINDOW_LIMIT,
    HOSPlanner,
    plan_trip,
)

EPS = 1e-3
START = datetime(2026, 1, 5, 8, 0)


def miles_to_minutes(miles, mph=55.0):
    return miles / mph * 60.0


def assert_compliant(test, segments):
    """Walk the raw timeline and verify no HOS limit is ever violated."""
    driving_today = 0.0
    since_break = 0.0
    window_used = 0.0
    window_open = False

    for seg in segments:
        if seg.kind in {"rest", "restart"}:
            driving_today = since_break = window_used = 0.0
            window_open = False
            continue
        if seg.kind == "break":
            since_break = 0.0
            if window_open:
                window_used += seg.duration
            continue

        if not window_open:
            window_open = True
            window_used = 0.0
        window_used += seg.duration
        if seg.status == DRIVING:
            driving_today += seg.duration
            since_break += seg.duration
            test.assertLessEqual(since_break, BREAK_AFTER + EPS, "8h driving/break rule violated")

        test.assertLessEqual(driving_today, DRIVE_LIMIT + EPS, "11h driving limit violated")
        test.assertLessEqual(window_used, WINDOW_LIMIT + EPS, "14h window violated")

        if seg.status == ON_DUTY and seg.duration >= 30:
            since_break = 0.0


class HOSPlannerTests(SimpleTestCase):
    def _run(self, miles, leg_a, cycle):
        planner = HOSPlanner(miles, miles_to_minutes(miles), leg_a, cycle, START)
        planner.plan()
        return planner

    def test_short_trip_single_day_no_rest_no_fuel(self):
        planner = self._run(120, 40, 0)
        result = plan_trip(120, miles_to_minutes(120), 40, 0, START)
        kinds = {s["kind"] for s in result["stops"]}
        self.assertIn("pickup", kinds)
        self.assertIn("dropoff", kinds)
        self.assertNotIn("fuel", kinds)
        self.assertNotIn("rest", kinds)
        self.assertEqual(result["summary"]["num_days"], 1)
        assert_compliant(self, planner.segments)

    def test_long_day_requires_30_minute_break(self):
        # Short first leg, then ~10h of continuous driving after pickup must
        # force a standalone 30-minute break once 8h of driving accrues.
        planner = self._run(560, 10, 0)
        kinds = [s.kind for s in planner.segments]
        self.assertIn("break", kinds)
        assert_compliant(self, planner.segments)

    def test_fuel_stop_every_1000_miles(self):
        result = plan_trip(2100, miles_to_minutes(2100), 50, 0, START)
        fuel_stops = [s for s in result["stops"] if s["kind"] == "fuel"]
        # 2100 miles -> fuel at 1000 and 2000 -> 2 stops.
        self.assertEqual(len(fuel_stops), 2)

    def test_multi_day_trip_has_ten_hour_rest(self):
        planner = self._run(1500, 60, 0)
        kinds = [s.kind for s in planner.segments]
        self.assertIn("rest", kinds)
        result = plan_trip(1500, miles_to_minutes(1500), 60, 0, START)
        self.assertGreater(result["summary"]["num_days"], 1)
        assert_compliant(self, planner.segments)

    def test_cycle_limit_triggers_34h_restart(self):
        # Start with 68h already used; a long trip must hit the 70h cap.
        planner = self._run(2000, 60, 68)
        kinds = [s.kind for s in planner.segments]
        self.assertIn("restart", kinds)
        assert_compliant(self, planner.segments)

    def test_pickup_and_dropoff_are_one_hour_each(self):
        result = plan_trip(300, miles_to_minutes(300), 100, 0, START)
        pickup = next(s for s in result["stops"] if s["kind"] == "pickup")
        dropoff = next(s for s in result["stops"] if s["kind"] == "dropoff")
        self.assertEqual(pickup["duration_min"], 60)
        self.assertEqual(dropoff["duration_min"], 60)

    def test_logs_cover_full_days(self):
        result = plan_trip(1500, miles_to_minutes(1500), 60, 0, START)
        for log in result["logs"]:
            total = sum(v for v in log["totals"].values())
            # Each daily log grid should account for ~24 hours.
            self.assertAlmostEqual(total, 24.0, delta=0.2)
            # Entries should be contiguous and cover 0..1440.
            self.assertEqual(log["entries"][0]["start"], 0)
            self.assertEqual(log["entries"][-1]["end"], 24 * 60)
            for a, b in zip(log["entries"], log["entries"][1:]):
                self.assertEqual(a["end"], b["start"])

    def test_logs_include_recap_and_mileage(self):
        result = plan_trip(1500, miles_to_minutes(1500), 60, 8, START)
        for log in result["logs"]:
            recap = log["recap"]
            # Recap math: available = 70 - rolling 8-day on-duty total.
            self.assertAlmostEqual(
                recap["available_tomorrow"],
                max(0.0, 70.0 - recap["total_on_duty_8day"]),
                delta=0.01,
            )
            self.assertEqual(recap["on_duty_today"], log["total_on_duty"])
            # Each day exposes its start/end mileage for the From/To fields.
            self.assertIn("start_miles", log)
            self.assertIn("end_miles", log)
            self.assertGreaterEqual(log["end_miles"], log["start_miles"])
        # Day 1's rolling total includes the 8 hours already used pre-trip.
        self.assertGreaterEqual(result["logs"][0]["recap"]["total_on_duty_8day"], 8.0)

    def test_zero_distance_is_safe(self):
        result = plan_trip(0, 0, 0, 0, START)
        # Even a degenerate trip should still record pickup + dropoff.
        kinds = {s["kind"] for s in result["stops"]}
        self.assertIn("pickup", kinds)
        self.assertIn("dropoff", kinds)
