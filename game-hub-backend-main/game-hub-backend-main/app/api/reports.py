"""
Reports API (v1 copy + extras): full reports endpoints plus new ones for:
- Customer date-wise credit
- Table utilization (dashboard)
- Top canteen items (dashboard)

This file mirrors `app.api.reports` but uses the versioned schemas/services
(`report_1`, `report_service_1`) and adds extra endpoints at the bottom.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.report_1 import (
    RevenueSummary,
    UtilizationSummary,
    PlayerSpendSummary,
    RevenueByGameTypeSummary,
    RevenueByHourSummary,
    ReportSummaryResponse,
    ReportBillsResponse,
    ReportBillsItem,
    ReportCustomerResponse,
    ReportCustomerItem,
    ReportGameUnitResponse,
    ReportGameUnitItem,
    ReportProductsResponse,
    ReportProductsItem,
    ReportCollectiveResponse,
    CustomerCreditByDateItem,
    CustomerCreditByDateResponse,
    TableUtilizationUnitItem,
    TableUtilizationResponse,
    TopCanteenItem,
    TopCanteenItemsResponse,
)
from app.services.report_service import (
    revenue_report,
    utilization_report,
    player_spend_report,
    revenue_by_game_type_report,
    revenue_by_hour_report,
    summary_report,
    bills_report,
    customer_report,
    game_unit_report,
    products_report,
    collective_report,
    customer_credit_by_date_report,
    table_utilization_report,
    top_canteen_items_report,
)


router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[RequireCashier])


@router.get("/revenue", response_model=SuccessResponse[RevenueSummary])
def get_revenue(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    game_type_id: int | None = Query(None),
    game_unit_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = revenue_report(
        db,
        current_user.tenant_id,
        start_date=start_date,
        end_date=end_date,
        game_type_id=game_type_id,
        game_unit_id=game_unit_id,
    )
    return SuccessResponse(data=RevenueSummary(**data))


@router.get("/utilization", response_model=SuccessResponse[UtilizationSummary])
def get_utilization(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    game_type_id: int | None = Query(None),
    game_unit_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = utilization_report(
        db,
        current_user.tenant_id,
        start_date=start_date,
        end_date=end_date,
        game_type_id=game_type_id,
        game_unit_id=game_unit_id,
    )
    return SuccessResponse(data=UtilizationSummary(**data))


@router.get("/player-spend", response_model=SuccessResponse[list[PlayerSpendSummary]])
def get_player_spend(
    session_id: int | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    game_type_id: int | None = Query(None),
    game_unit_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = player_spend_report(
        db,
        current_user.tenant_id,
        session_id=session_id,
        start_date=start_date,
        end_date=end_date,
        game_type_id=game_type_id,
        game_unit_id=game_unit_id,
    )
    return SuccessResponse(data=[PlayerSpendSummary(**r) for r in rows])


@router.get("/revenue-by-game-type", response_model=SuccessResponse[list[RevenueByGameTypeSummary]])
def get_revenue_by_game_type(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = revenue_by_game_type_report(
        db, current_user.tenant_id, start_date=start_date, end_date=end_date
    )
    return SuccessResponse(data=[RevenueByGameTypeSummary(**r) for r in rows])


@router.get("/revenue-by-hour", response_model=SuccessResponse[list[RevenueByHourSummary]])
def get_revenue_by_hour(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = revenue_by_hour_report(
        db, current_user.tenant_id, start_date=start_date, end_date=end_date
    )
    return SuccessResponse(data=[RevenueByHourSummary(**r) for r in rows])


@router.get("/summary", response_model=SuccessResponse[ReportSummaryResponse])
def get_summary(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = summary_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    return SuccessResponse(data=ReportSummaryResponse(**data))


@router.get("/bills", response_model=SuccessResponse[ReportBillsResponse])
def get_bills(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = bills_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    data["bills"] = [ReportBillsItem(**b) for b in data["bills"]]
    return SuccessResponse(data=ReportBillsResponse(**data))


@router.get("/customer", response_model=SuccessResponse[ReportCustomerResponse])
def get_customer_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = customer_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    data["customers"] = [ReportCustomerItem(**c) for c in data["customers"]]
    return SuccessResponse(data=ReportCustomerResponse(**data))


@router.get("/game-unit", response_model=SuccessResponse[ReportGameUnitResponse])
def get_game_unit_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = game_unit_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    data["units"] = [ReportGameUnitItem(**u) for u in data["units"]]
    return SuccessResponse(data=ReportGameUnitResponse(**data))


@router.get("/products", response_model=SuccessResponse[ReportProductsResponse])
def get_products_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = products_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    data["products"] = [ReportProductsItem(**p) for p in data["products"]]
    return SuccessResponse(data=ReportProductsResponse(**data))


@router.get("/collective", response_model=SuccessResponse[ReportCollectiveResponse])
def get_collective_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = collective_report(
        db, current_user.tenant_id, period=period, start_date=start_date, end_date=end_date
    )
    return SuccessResponse(data=ReportCollectiveResponse(**data))


# ---- Extra endpoints (v1 additions) ----


@router.get(
    "/customer-credit",
    response_model=SuccessResponse[CustomerCreditByDateResponse],
)
def get_customer_credit_report(
    player_id: int = Query(..., description="Player/customer id (from sessions / reports.customer)"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Date-wise credit details for a single customer/player.
    """
    data = customer_credit_by_date_report(
        db,
        current_user.tenant_id,
        player_id=player_id,
        start_date=start_date,
        end_date=end_date,
    )
    data["items"] = [CustomerCreditByDateItem(**row) for row in data["items"]]
    return SuccessResponse(data=CustomerCreditByDateResponse(**data))


@router.get(
    "/table-utilization",
    response_model=SuccessResponse[TableUtilizationResponse],
)
def get_table_utilization_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Table utilization data for dashboard charts.
    """
    data = table_utilization_report(
        db,
        current_user.tenant_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
    data["units"] = [TableUtilizationUnitItem(**u) for u in data["units"]]
    return SuccessResponse(data=TableUtilizationResponse(**data))


@router.get(
    "/canteen-top-items",
    response_model=SuccessResponse[TopCanteenItemsResponse],
)
def get_canteen_top_items_report(
    period: str = Query("daily", description="daily | weekly | monthly | custom"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Top N canteen items by revenue for dashboard charts.
    """
    data = top_canteen_items_report(
        db,
        current_user.tenant_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    data["items"] = [TopCanteenItem(**p) for p in data["items"]]
    return SuccessResponse(data=TopCanteenItemsResponse(**data))

