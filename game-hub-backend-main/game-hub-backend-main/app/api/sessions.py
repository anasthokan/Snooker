
"""
Sessions API (v1): session detail includes orders (canteen) so returning to session shows saved items.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.session import (
    SessionStartRequest,
    SessionStartWithPlayersRequest,
    SessionStartResponse,
    SessionPauseRequest,
    SessionResumeRequest,
    SessionEndRequest,
    PlayerAddRequest,
    SessionResponse,
    SessionDetailResponse,
    SessionPlayerResponse,
)
from app.schemas.billing import OrderResponse
from app.services.session_engine import (
    start_session,
    start_session_with_players,
    pause_session,
    resume_session,
    end_session,
    get_session_for_tenant,
    list_sessions_for_tenant,
    add_player_to_session,
    compute_duration_seconds,
)
from app.services.billing_service import calculate_bill, apply_total_to_session

router = APIRouter(prefix="/sessions", tags=["Sessions"], dependencies=[RequireCashier])


def _session_to_response(session, include_duration: bool = True):
    return {
        "id": session.id,
        "tenant_id": session.tenant_id,
        "game_type_id": session.game_type_id,
        "game_unit_id": session.game_unit_id,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "paused_seconds": session.paused_seconds,
        "status": session.status,
        "total_charge": session.total_charge,
        "duration_seconds": compute_duration_seconds(session) if include_duration else None,
    }


@router.get("", response_model=SuccessResponse[list[SessionResponse]])
def list_sessions(
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = list_sessions_for_tenant(db, current_user.tenant_id, status=status, skip=skip, limit=limit)
    return SuccessResponse(data=[SessionResponse(**_session_to_response(s)) for s in sessions])


@router.post("/start", response_model=SuccessResponse[SessionStartResponse])
def session_start(
    body: SessionStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = start_session(db, current_user.tenant_id, body.game_type_id, body.game_unit_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data=SessionStartResponse(
            session_id=session.id,
            game_type_id=session.game_type_id,
            game_unit_id=session.game_unit_id,
            start_time=session.start_time,
            status=session.status,
        ),
        message="Session started",
    )


@router.post("/start-with-players", response_model=SuccessResponse[SessionStartResponse])
def session_start_with_players(
    body: SessionStartWithPlayersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        players = [p.model_dump() for p in body.players]
        session = start_session_with_players(
            db, current_user.tenant_id, body.game_type_id, body.game_unit_id, players
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data=SessionStartResponse(
            session_id=session.id,
            game_type_id=session.game_type_id,
            game_unit_id=session.game_unit_id,
            start_time=session.start_time,
            status=session.status,
        ),
        message="Session started with players",
    )


@router.post("/pause", response_model=SuccessResponse[dict])
def session_pause(
    body: SessionPauseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = pause_session(db, body.session_id, current_user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data={"session_id": session.id, "status": session.status}, message="Session paused")


@router.post("/resume", response_model=SuccessResponse[dict])
def session_resume(
    body: SessionResumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = resume_session(db, body.session_id, current_user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data={"session_id": session.id, "status": session.status}, message="Session resumed")


@router.post("/end", response_model=SuccessResponse[dict])
def session_end(
    body: SessionEndRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = end_session(db, body.session_id, current_user.tenant_id)
        if not session.total_charge or session.total_charge <= 0:
            breakdown = calculate_bill(
                db,
                session.id,
                current_user.tenant_id,
                vat_percent=Decimal("15"),
                discount_amount=Decimal("0"),
            )
            apply_total_to_session(
                db,
                session.id,
                current_user.tenant_id,
                breakdown["total"],
            )
            db.refresh(session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(
        data={
            "session_id": session.id,
            "status": session.status,
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "duration_seconds": compute_duration_seconds(session),
        },
        message="Session ended",
    )


@router.get("/{session_id}", response_model=SuccessResponse[SessionDetailResponse])
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get session details with players and canteen orders (so UI shows saved items when going back)."""
    session = get_session_for_tenant(db, session_id, current_user.tenant_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    orders_data = [OrderResponse.model_validate(o) for o in session.orders]
    data = SessionDetailResponse(
        **(_session_to_response(session)),
        players=[SessionPlayerResponse.model_validate(p) for p in session.players],
        orders=orders_data,
    )
    return SuccessResponse(data=data)


@router.post("/players", response_model=SuccessResponse[SessionPlayerResponse], status_code=201)
def add_player(
    body: PlayerAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        player = add_player_to_session(
            db, body.session_id, current_user.tenant_id, body.name, body.mobile, body.membership_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuccessResponse(data=SessionPlayerResponse.model_validate(player), message="Player added")
