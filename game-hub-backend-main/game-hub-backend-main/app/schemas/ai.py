"""
AI data response schemas. Read-only; for ML consumption.
"""
from datetime import date
from typing import Any

from pydantic import BaseModel


class SessionsDataResponse(BaseModel):
    """Sessions data for AI: demand prediction, utilization."""

    period_start: date
    period_end: date
    count: int
    sessions: list[dict[str, Any]]


class RevenueDataResponse(BaseModel):
    """Revenue data for AI: demand prediction, smart pricing."""

    period_start: date
    period_end: date
    count: int
    revenue_records: list[dict[str, Any]]


class PlayerDataResponse(BaseModel):
    """Player data for AI: fraud detection, player spend."""

    period_start: date
    period_end: date
    count: int
    player_records: list[dict[str, Any]]
