"""
Session engine: start, pause, resume, end. Backend-controlled timer.
duration = (current_time - start_time) - paused_seconds
"""
from datetime import datetime, timezone
from decimal import Decimal
import logging

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel, SessionPlayer
from app.models.game_type import GameType
from app.models.game_unit import GameUnit

logger = logging.getLogger(__name__)

STATUS_ACTIVE = "active"
STATUS_PAUSED = "paused"
STATUS_ENDED = "ended"
MAX_PLAYERS_PER_SESSION = 10


def list_sessions_for_tenant(
    db: Session,
    tenant_id: int,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[SessionModel]:
    """List sessions for tenant, optionally filter by status (active, paused, ended)."""
    q = db.query(SessionModel).filter(SessionModel.tenant_id == tenant_id)
    if status:
        q = q.filter(SessionModel.status == status)
    q = q.order_by(SessionModel.start_time.desc())
    return q.offset(skip).limit(limit).all()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_session_for_tenant(db: Session, session_id: int, tenant_id: int) -> SessionModel | None:
    """Get session by id scoped to tenant."""
    return (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.tenant_id == tenant_id)
        .first()
    )


def compute_duration_seconds(session: SessionModel, as_of: datetime | None = None) -> int:
    """
    duration = (current_time - start_time) - paused_seconds
    If session is paused, include current pause interval in paused_seconds for the calculation.
    """
    end = as_of or (session.end_time if session.status == STATUS_ENDED else _now())
    total_elapsed = int((end - session.start_time).total_seconds())
    pause_total = session.paused_seconds
    if session.paused_at and session.status == STATUS_PAUSED:
        pause_total += int((_now() - session.paused_at).total_seconds())
    return max(0, total_elapsed - pause_total)


def start_session(
    db: Session,
    tenant_id: int,
    game_type_id: int,
    game_unit_id: int,
) -> SessionModel:
    """Start a new session. Validates game_type and game_unit belong to tenant and unit is available."""
    gt = db.query(GameType).filter(GameType.id == game_type_id, GameType.tenant_id == tenant_id).first()
    if not gt:
        raise ValueError("Game type not found")
    gu = db.query(GameUnit).filter(GameUnit.id == game_unit_id, GameUnit.tenant_id == tenant_id).first()
    if not gu:
        raise ValueError("Game unit not found")
    if gu.game_type_id != game_type_id:
        raise ValueError("Game unit does not belong to this game type")
    # Check no active session on this unit
    existing = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.game_unit_id == game_unit_id,
            SessionModel.status.in_([STATUS_ACTIVE, STATUS_PAUSED]),
        )
        .first()
    )
    if existing:
        raise ValueError("This game unit already has an active session")
    now = _now()
    session = SessionModel(
        tenant_id=tenant_id,
        game_type_id=game_type_id,
        game_unit_id=game_unit_id,
        start_time=now,
        status=STATUS_ACTIVE,
        paused_seconds=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info("Session started: id=%s unit=%s", session.id, game_unit_id)
    return session


def start_session_with_players(
    db: Session,
    tenant_id: int,
    game_type_id: int,
    game_unit_id: int,
    players: list[dict],
) -> SessionModel:
    """Start a session and add 1-10 players in one go. players: [{ name, mobile?, membership_id? }]."""
    if not players or len(players) > MAX_PLAYERS_PER_SESSION:
        raise ValueError(f"Between 1 and {MAX_PLAYERS_PER_SESSION} players required")
    session = start_session(db, tenant_id, game_type_id, game_unit_id)
    for p in players:
        name = (p.get("name") or "").strip()
        if not name:
            raise ValueError("Player name is required")
        add_player_to_session(
            db,
            session.id,
            tenant_id,
            name=name,
            mobile=p.get("mobile") or None,
            membership_id=p.get("membership_id") or None,
        )
    db.refresh(session)
    return session


def pause_session(db: Session, session_id: int, tenant_id: int) -> SessionModel:
    """Pause an active session. Sets paused_at to now."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status != STATUS_ACTIVE:
        raise ValueError("Session is not active")
    now = _now()
    session.status = STATUS_PAUSED
    session.paused_at = now
    db.commit()
    db.refresh(session)
    logger.info("Session paused: id=%s", session.id)
    return session


def resume_session(db: Session, session_id: int, tenant_id: int) -> SessionModel:
    """Resume a paused session. Adds (now - paused_at) to paused_seconds, clears paused_at."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status != STATUS_PAUSED:
        raise ValueError("Session is not paused")
    now = _now()
    if session.paused_at:
        session.paused_seconds += int((now - session.paused_at).total_seconds())
    session.paused_at = None
    session.status = STATUS_ACTIVE
    db.commit()
    db.refresh(session)
    logger.info("Session resumed: id=%s", session.id)
    return session


def end_session(db: Session, session_id: int, tenant_id: int) -> SessionModel:
    """End session. If paused, add current pause to paused_seconds; set end_time and status=ended."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status == STATUS_ENDED:
        raise ValueError("Session already ended")
    now = _now()
    if session.status == STATUS_PAUSED and session.paused_at:
        session.paused_seconds += int((now - session.paused_at).total_seconds())
        session.paused_at = None
    session.end_time = now
    session.status = STATUS_ENDED
    db.commit()
    db.refresh(session)
    logger.info("Session ended: id=%s", session.id)
    return session


def add_player_to_session(
    db: Session,
    session_id: int,
    tenant_id: int,
    name: str,
    mobile: str | None = None,
    membership_id: str | None = None,
) -> SessionPlayer:
    """Add a player to an active or paused session. Max 10 players per session."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")
    if session.status == STATUS_ENDED:
        raise ValueError("Cannot add player to ended session")
    if len(session.players) >= MAX_PLAYERS_PER_SESSION:
        raise ValueError(f"Maximum {MAX_PLAYERS_PER_SESSION} players per session")
    player = SessionPlayer(
        session_id=session_id,
        name=name,
        mobile=mobile,
        membership_id=membership_id,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


def list_players_for_session(db: Session, session_id: int, tenant_id: int) -> list[SessionPlayer]:
    """List players in a session."""
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        return []
    return list(session.players)
