"""
Customer portal: table floor view for logged-in customers.
"""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.game_type import GameType
from app.models.game_unit import GameUnit
from app.models.session import Session as SessionModel
from app.models.tenant import Tenant
from app.schemas.customer_auth import CustomerTableItem, CustomerFloorResponse

ACTIVE_STATUSES = ("active", "paused")


def get_customer_floor(db: Session, tenant_id: int) -> CustomerFloorResponse:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    tenant_name = tenant.name if tenant else "GameHub Pro"

    game_types = {
        gt.id: gt
        for gt in db.query(GameType)
        .filter(GameType.tenant_id == tenant_id, GameType.status == "active")
        .all()
    }

    units = (
        db.query(GameUnit)
        .filter(GameUnit.tenant_id == tenant_id, GameUnit.status != "disabled")
        .order_by(GameUnit.id)
        .all()
    )

    active_sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.tenant_id == tenant_id,
            SessionModel.status.in_(ACTIVE_STATUSES),
        )
        .all()
    )
    session_by_unit = {s.game_unit_id: s for s in active_sessions}

    tables: list[CustomerTableItem] = []
    for unit in units:
        gt = game_types.get(unit.game_type_id)
        if not gt:
            continue

        unit_status = (unit.status or "active").lower()
        floor_status = "available"
        if unit_status == "maintenance":
            floor_status = "maintenance"
        else:
            session = session_by_unit.get(unit.id)
            if session:
                if session.status == "paused" or session.paused_at:
                    floor_status = "paused"
                else:
                    floor_status = "occupied"

        session = session_by_unit.get(unit.id)
        tables.append(
            CustomerTableItem(
                unit_id=unit.id,
                game_type_id=gt.id,
                game_type_name=gt.name,
                unit_name=unit.unit_name,
                weekday_price=Decimal(str(unit.weekday_price)),
                weekend_price=Decimal(str(unit.weekend_price)),
                status=floor_status,
                session_id=session.id if session else None,
            )
        )

    return CustomerFloorResponse(tenant_name=tenant_name, tables=tables)
