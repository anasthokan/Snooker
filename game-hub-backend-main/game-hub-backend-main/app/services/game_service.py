
"""
Game service (v1): CRUD + delete unit + list only available units (not occupied).
"""
from typing import Sequence

from sqlalchemy.orm import Session

from app.models.game_type import GameType
from app.models.game_unit import GameUnit
from app.models.session import Session as SessionModel
from app.schemas.game import GameTypeCreate, GameTypeUpdate, GameUnitCreate, GameUnitUpdate

STATUS_ACTIVE = "active"
STATUS_PAUSED = "paused"


def create_game_type(db: Session, data: GameTypeCreate, tenant_id: int) -> GameType:
    """Create game type for tenant."""
    gt = GameType(
        tenant_id=tenant_id,
        name=data.name,
        billing_type=data.billing_type,
        icon=data.icon,
        status=data.status,
    )
    db.add(gt)
    db.commit()
    db.refresh(gt)
    return gt


def get_game_type_by_id(db: Session, game_type_id: int, tenant_id: int) -> GameType | None:
    """Get game type by id scoped to tenant."""
    return (
        db.query(GameType)
        .filter(GameType.id == game_type_id, GameType.tenant_id == tenant_id)
        .first()
    )


def list_game_types(db: Session, tenant_id: int, skip: int = 0, limit: int = 100) -> Sequence[GameType]:
    """List game types for tenant."""
    return (
        db.query(GameType)
        .filter(GameType.tenant_id == tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_game_type(db: Session, gt: GameType, data: GameTypeUpdate) -> GameType:
    """Update game type."""
    if data.name is not None:
        gt.name = data.name
    if data.billing_type is not None:
        gt.billing_type = data.billing_type
    if data.icon is not None:
        gt.icon = data.icon
    if data.status is not None:
        gt.status = data.status
    db.commit()
    db.refresh(gt)
    return gt


def create_game_unit(db: Session, data: GameUnitCreate, tenant_id: int) -> GameUnit:
    """Create game unit for tenant. Validates game_type belongs to tenant."""
    gu = GameUnit(
        tenant_id=tenant_id,
        game_type_id=data.game_type_id,
        unit_name=data.unit_name,
        weekday_price=data.weekday_price,
        weekend_price=data.weekend_price,
        special_price=data.special_price,
        status=data.status,
    )
    db.add(gu)
    db.commit()
    db.refresh(gu)
    return gu


def get_game_unit_by_id(db: Session, unit_id: int, tenant_id: int) -> GameUnit | None:
    """Get game unit by id scoped to tenant."""
    return (
        db.query(GameUnit)
        .filter(GameUnit.id == unit_id, GameUnit.tenant_id == tenant_id)
        .first()
    )


def _occupied_unit_ids(db: Session, tenant_id: int) -> set[int]:
    """Return set of game_unit_id that have an active or paused session."""
    rows = (
        db.query(SessionModel.game_unit_id)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status.in_([STATUS_ACTIVE, STATUS_PAUSED]),
        )
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def list_game_units(
    db: Session,
    tenant_id: int,
    game_type_id: int | None = None,
    status: str | None = None,
    available_only: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[GameUnit]:
    """List game units. If available_only=True, exclude units that have an active/paused session."""
    q = db.query(GameUnit).filter(GameUnit.tenant_id == tenant_id)
    if game_type_id is not None:
        q = q.filter(GameUnit.game_type_id == game_type_id)
    if status is not None:
        q = q.filter(GameUnit.status == status)
    if available_only:
        occupied = _occupied_unit_ids(db, tenant_id)
        if occupied:
            q = q.filter(~GameUnit.id.in_(occupied))
        # Only show units that are active/available for selection
        q = q.filter(GameUnit.status.in_(["active", "available"]))
    return q.offset(skip).limit(limit).all()


def update_game_unit(db: Session, gu: GameUnit, data: GameUnitUpdate) -> GameUnit:
    """Update game unit."""
    if data.game_type_id is not None:
        gu.game_type_id = data.game_type_id
    if data.unit_name is not None:
        gu.unit_name = data.unit_name
    if data.weekday_price is not None:
        gu.weekday_price = data.weekday_price
    if data.weekend_price is not None:
        gu.weekend_price = data.weekend_price
    if data.special_price is not None:
        gu.special_price = data.special_price
    if data.status is not None:
        gu.status = data.status
    db.commit()
    db.refresh(gu)
    return gu


def delete_game_unit(db: Session, unit_id: int, tenant_id: int) -> bool:
    """Remove game unit: soft-delete by setting status to 'disabled'. Returns True if found and updated."""
    gu = get_game_unit_by_id(db, unit_id, tenant_id)
    if not gu:
        return False
    gu.status = "disabled"
    db.commit()
    return True
