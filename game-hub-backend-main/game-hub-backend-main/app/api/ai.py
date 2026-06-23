"""
AI module - READ-ONLY endpoints for AI/ML.

Per documentation:
- AI will use: Sessions data, Revenue data, Player data
- AI will have read-only DB access
- Future: Demand prediction, Fraud detection, Smart pricing
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireManager
from app.core.database import get_db
from app.models.user import User
from app.schemas.ai import SessionsDataResponse, RevenueDataResponse, PlayerDataResponse
from app.schemas.common import SuccessResponse
from app.services.ai_data_service import get_sessions_data, get_revenue_data, get_player_data

router = APIRouter(
    prefix="/ai",
    tags=["AI Data"],
    dependencies=[RequireManager],
)


@router.get("/sessions", response_model=SuccessResponse[SessionsDataResponse])
def ai_sessions(
    start_date: date | None = Query(None, description="Start date for sessions data"),
    end_date: date | None = Query(None, description="End date for sessions data"),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Read-only: sessions data for AI (demand prediction, utilization).
    All data filtered by tenant_id.
    """
    sessions = get_sessions_data(
        db, current_user.tenant_id, start_date=start_date, end_date=end_date, limit=limit
    )
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=90))
    return SuccessResponse(
        data=SessionsDataResponse(
            period_start=start,
            period_end=end,
            count=len(sessions),
            sessions=sessions,
        )
    )


@router.get("/revenue", response_model=SuccessResponse[RevenueDataResponse])
def ai_revenue(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Read-only: revenue data for AI (demand prediction, smart pricing).
    All data filtered by tenant_id.
    """
    records = get_revenue_data(
        db, current_user.tenant_id, start_date=start_date, end_date=end_date, limit=limit
    )
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=90))
    return SuccessResponse(
        data=RevenueDataResponse(
            period_start=start,
            period_end=end,
            count=len(records),
            revenue_records=records,
        )
    )


@router.get("/players", response_model=SuccessResponse[PlayerDataResponse])
def ai_players(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Read-only: player data for AI (fraud detection, player spend).
    All data filtered by tenant_id.
    """
    records = get_player_data(
        db, current_user.tenant_id, start_date=start_date, end_date=end_date, limit=limit
    )
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=90))
    return SuccessResponse(
        data=PlayerDataResponse(
            period_start=start,
            period_end=end,
            count=len(records),
            player_records=records,
        )
    )
