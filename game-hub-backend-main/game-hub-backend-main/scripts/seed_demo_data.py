"""
Seed demo parlour data for CityMall tenant (game types, units, products, sessions).
Usage: python -m scripts.seed_demo_data [--force]
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.game_type import GameType
from app.models.game_unit import GameUnit
from app.models.order import PlayerOrder
from app.models.payment import Payment
from app.models.product import Product
from app.models.session import Session, SessionPlayer
from app.models.tenant import Tenant

TENANT_NAME = "CityMall"


def get_citymall_tenant(db) -> Tenant:
    tenant = db.query(Tenant).filter(func.lower(Tenant.name) == TENANT_NAME.lower()).first()
    if not tenant:
        raise RuntimeError(f"Tenant '{TENANT_NAME}' not found. Run seed_demo_users first.")
    return tenant


def clear_sessions(db, tenant_id: int) -> None:
    sessions = db.query(Session).filter(Session.tenant_id == tenant_id).all()
    for s in sessions:
        db.query(Payment).filter(Payment.session_id == s.id).delete(synchronize_session=False)
        db.query(PlayerOrder).filter(PlayerOrder.session_id == s.id).delete(synchronize_session=False)
        db.query(SessionPlayer).filter(SessionPlayer.session_id == s.id).delete(synchronize_session=False)
    db.query(Session).filter(Session.tenant_id == tenant_id).delete(synchronize_session=False)
    db.commit()


def ensure_catalog(db, tenant_id: int) -> dict:
    """Create game types, units, products, customers if missing."""
    catalog: dict = {"game_types": {}, "units": {}, "products": {}}

    game_defs = [
        ("Snooker", "hourly", [("Table 1", 120, 150), ("Table 2", 120, 150)]),
        ("Pool", "hourly", [("Table 1", 100, 130), ("Table 2", 100, 130)]),
        ("Carrom", "hourly", [("Board 1", 60, 80)]),
    ]
    for name, billing, units in game_defs:
        gt = (
            db.query(GameType)
            .filter(GameType.tenant_id == tenant_id, func.lower(GameType.name) == name.lower())
            .first()
        )
        if not gt:
            gt = GameType(
                tenant_id=tenant_id,
                name=name,
                billing_type=billing,
                status="active",
            )
            db.add(gt)
            db.flush()
        catalog["game_types"][name] = gt
        for unit_name, weekday, weekend in units:
            gu = (
                db.query(GameUnit)
                .filter(
                    GameUnit.tenant_id == tenant_id,
                    GameUnit.game_type_id == gt.id,
                    GameUnit.unit_name == unit_name,
                )
                .first()
            )
            if not gu:
                gu = GameUnit(
                    tenant_id=tenant_id,
                    game_type_id=gt.id,
                    unit_name=unit_name,
                    weekday_price=Decimal(str(weekday)),
                    weekend_price=Decimal(str(weekend)),
                    status="active",
                )
                db.add(gu)
                db.flush()
            catalog["units"][(name, unit_name)] = gu

    product_defs = [
        ("Tea", Decimal("15"), "Beverages"),
        ("Coffee", Decimal("25"), "Beverages"),
        ("Cold Drink", Decimal("35"), "Beverages"),
        ("Chips", Decimal("30"), "Snacks"),
        ("Sandwich", Decimal("80"), "Snacks"),
    ]
    for pname, price, category in product_defs:
        prod = (
            db.query(Product)
            .filter(Product.tenant_id == tenant_id, func.lower(Product.name) == pname.lower())
            .first()
        )
        if not prod:
            prod = Product(
                tenant_id=tenant_id,
                name=pname,
                price=price,
                category=category,
                status="active",
            )
            db.add(prod)
            db.flush()
        catalog["products"][pname] = prod

    customer_defs = [
        ("Rahul Sharma", "9876500001"),
        ("Amit Patel", "9876500002"),
        ("Vikram Singh", "9876500003"),
    ]
    for cname, mobile in customer_defs:
        cust = (
            db.query(Customer)
            .filter(Customer.tenant_id == tenant_id, Customer.mobile == mobile)
            .first()
        )
        if not cust:
            db.add(Customer(tenant_id=tenant_id, name=cname, mobile=mobile))
    db.commit()
    return catalog


def _rate_for_unit(unit: GameUnit, when: datetime) -> Decimal:
    return unit.weekend_price if when.weekday() >= 5 else unit.weekday_price


def _add_ended_session(
    db,
    tenant_id: int,
    unit: GameUnit,
    game_type: GameType,
    start: datetime,
    hours: float,
    players: list[str],
    orders: list[tuple[str, int]],
    catalog: dict,
) -> None:
    end = start + timedelta(hours=hours)
    rate = _rate_for_unit(unit, start)
    game_charge = (Decimal(str(hours)) * rate).quantize(Decimal("0.01"))
    canteen = Decimal("0")
    order_rows: list[tuple[SessionPlayer, Product, int]] = []

    session = Session(
        tenant_id=tenant_id,
        game_type_id=game_type.id,
        game_unit_id=unit.id,
        start_time=start,
        end_time=end,
        status="ended",
        total_charge=Decimal("0"),
        paused_seconds=0,
    )
    db.add(session)
    db.flush()

    player_objs = []
    for pname in players:
        sp = SessionPlayer(session_id=session.id, name=pname)
        db.add(sp)
        db.flush()
        player_objs.append(sp)

    for prod_name, qty in orders:
        prod = catalog["products"][prod_name]
        line = prod.price * qty
        canteen += line
        order_rows.append((player_objs[0], prod, qty))

    total = game_charge + canteen
    session.total_charge = total

    for player, prod, qty in order_rows:
        db.add(
            PlayerOrder(
                session_id=session.id,
                player_id=player.id,
                product_id=prod.id,
                quantity=qty,
                price=prod.price,
            )
        )

    db.add(
        Payment(
            session_id=session.id,
            amount=total,
            method="cash",
            status="completed",
        )
    )


def seed_sessions(db, tenant_id: int, catalog: dict) -> None:
    now = datetime.now(timezone.utc)
    today = now.date()

    # Today's completed sessions (spread across hours for charts)
    today_sessions = [
        ("Snooker", "Table 1", 10, 2.0, ["Rahul", "Amit"], [("Tea", 2), ("Coffee", 1)]),
        ("Pool", "Table 1", 14, 1.5, ["Vikram"], [("Cold Drink", 1), ("Chips", 1)]),
        ("Carrom", "Board 1", 16, 1.0, ["Suresh", "Karan"], [("Tea", 2)]),
        ("Snooker", "Table 2", 18, 2.5, ["Deepak"], [("Sandwich", 1), ("Coffee", 2)]),
    ]
    for game, unit, hour, hrs, players, orders in today_sessions:
        start = datetime.combine(today, datetime.min.time()).replace(
            hour=hour, minute=0, tzinfo=timezone.utc
        )
        _add_ended_session(
            db,
            tenant_id,
            catalog["units"][(game, unit)],
            catalog["game_types"][game],
            start,
            hrs,
            players,
            orders,
            catalog,
        )

    # Past week sessions for reports date range
    for days_ago in (1, 2, 3, 5, 7):
        d = today - timedelta(days=days_ago)
        start = datetime.combine(d, datetime.min.time()).replace(
            hour=11 + (days_ago % 4), minute=30, tzinfo=timezone.utc
        )
        game = "Pool" if days_ago % 2 == 0 else "Snooker"
        unit = "Table 1"
        _add_ended_session(
            db,
            tenant_id,
            catalog["units"][(game, unit)],
            catalog["game_types"][game],
            start,
            1.5,
            [f"Guest {days_ago}"],
            [("Tea", 1)],
            catalog,
        )

    # One active session for dashboard "Active Sessions" card
    active_start = now - timedelta(minutes=45)
    snooker2 = catalog["units"][("Snooker", "Table 2")]
    active = Session(
        tenant_id=tenant_id,
        game_type_id=catalog["game_types"]["Snooker"].id,
        game_unit_id=snooker2.id,
        start_time=active_start,
        end_time=None,
        status="active",
        paused_seconds=0,
    )
    db.add(active)
    db.flush()
    db.add(SessionPlayer(session_id=active.id, name="Live Player 1"))
    db.add(SessionPlayer(session_id=active.id, name="Live Player 2"))

    db.commit()


def main():
    force = "--force" in sys.argv[1:]
    db = SessionLocal()
    try:
        tenant = get_citymall_tenant(db)
        catalog = ensure_catalog(db, tenant.id)
        session_count = db.query(Session).filter(Session.tenant_id == tenant.id).count()
        if session_count and not force:
            print(f"Demo sessions already exist for {TENANT_NAME}. Use --force to reseed.")
            return
        if session_count and force:
            clear_sessions(db, tenant.id)
            print("Cleared old sessions.")
        seed_sessions(db, tenant.id, catalog)
        print(f"Demo data seeded for tenant: {TENANT_NAME} (id={tenant.id})")
        print("  - Game types: Snooker, Pool, Carrom")
        print("  - Products, customers, ended + active sessions")
    finally:
        db.close()


if __name__ == "__main__":
    main()
