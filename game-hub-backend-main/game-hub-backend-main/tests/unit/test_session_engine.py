"""
Unit tests: session engine duration calculation.
Per documentation: duration = (current_time - start_time) - paused_seconds
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

import pytest

from app.services.session_engine import compute_duration_seconds


def _mock_session(start_time, end_time=None, paused_seconds=0, paused_at=None, status="ended"):
    s = MagicMock()
    s.start_time = start_time
    s.end_time = end_time
    s.paused_seconds = paused_seconds
    s.paused_at = paused_at
    s.status = status
    return s


def test_compute_duration_seconds_ended_no_pause():
    start = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    end = datetime(2025, 1, 1, 11, 30, 0, tzinfo=timezone.utc)  # 90 min
    session = _mock_session(start, end_time=end, paused_seconds=0, status="ended")
    assert compute_duration_seconds(session, as_of=end) == 90 * 60


def test_compute_duration_seconds_ended_with_pause():
    start = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    end = datetime(2025, 1, 1, 11, 0, 0, tzinfo=timezone.utc)  # 60 min elapsed
    session = _mock_session(start, end_time=end, paused_seconds=600, status="ended")  # 10 min paused
    assert compute_duration_seconds(session, as_of=end) == 60 * 60 - 600  # 3000 sec = 50 min


def test_compute_duration_seconds_returns_non_negative():
    start = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(seconds=30)
    session = _mock_session(start, end_time=end, paused_seconds=60, status="ended")  # more pause than elapsed
    assert compute_duration_seconds(session, as_of=end) == 0
