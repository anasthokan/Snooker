"""
Additional report schemas (v1): customer date-wise credit details.

This module extends the existing `app.schemas.report` models without modifying them.
Use these schemas for new report endpoints that need per-date credit breakdown.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class CustomerCreditByDateItem(BaseModel):
    date: date
    paid: bool
    amount: Decimal


class CustomerCreditByDateResponse(BaseModel):
    customer_id: int
    period_start: date
    period_end: date
    items: list[CustomerCreditByDateItem]
    total_days_played: int
    total_credit_amount: Decimal


class TableUtilizationUnitItem(BaseModel):
    game_unit_id: int
    unit_name: str
    game_type_name: str
    revenue: Decimal
    session_count: int


class TableUtilizationResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    utilization_percent: float
    units: list[TableUtilizationUnitItem]


class TopCanteenItem(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal


class TopCanteenItemsResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    items: list[TopCanteenItem]


# ---- Base report schemas copied from app.schemas.report ----


class RevenueSummary(BaseModel):
    total_revenue: Decimal
    game_revenue: Decimal
    canteen_revenue: Decimal
    period_start: date | datetime
    period_end: date | datetime
    session_count: int


class UtilizationSummary(BaseModel):
    total_units: int
    utilized_units: int
    utilization_percent: float
    period_start: date | datetime
    period_end: date | datetime
    by_game_type: list[dict]


class PlayerSpendSummary(BaseModel):
    player_name: str
    player_id: int
    session_id: int
    total_spend: Decimal
    game_charge: Decimal
    canteen_charge: Decimal
    session_start: datetime
    session_end: datetime | None


class RevenueByGameTypeSummary(BaseModel):
    game_type_id: int
    game_type_name: str
    revenue: Decimal
    session_count: int


class RevenueByHourSummary(BaseModel):
    hour: int
    revenue: float


PeriodType = Literal["daily", "weekly", "monthly", "custom"]


class ReportSummaryResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_revenue: Decimal
    game_revenue: Decimal
    canteen_revenue: Decimal
    session_count: int
    bill_count: int


class ReportBillsItem(BaseModel):
    session_id: int
    total: Decimal
    game_charge: Decimal
    canteen_charge: Decimal
    vat_amount: Decimal
    end_time: datetime | None


class ReportBillsResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    bills: list[ReportBillsItem]
    total_amount: Decimal


class ReportCustomerItem(BaseModel):
    player_id: int
    player_name: str
    session_count: int
    total_spend: Decimal
    game_charge: Decimal
    canteen_charge: Decimal


class ReportCustomerResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    customers: list[ReportCustomerItem]


class ReportGameUnitItem(BaseModel):
    game_unit_id: int
    unit_name: str
    game_type_name: str
    revenue: Decimal
    session_count: int


class ReportGameUnitResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    units: list[ReportGameUnitItem]


class ReportProductsItem(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal


class ReportProductsResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    products: list[ReportProductsItem]


class ReportCollectiveResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_revenue: Decimal
    game_revenue: Decimal
    canteen_revenue: Decimal
    session_count: int
    utilization_percent: float
    top_game_units: list[dict]
    top_products: list[dict]

