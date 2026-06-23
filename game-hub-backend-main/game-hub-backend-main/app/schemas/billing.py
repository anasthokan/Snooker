"""
Billing and payment schemas.
"""
from decimal import Decimal
from datetime import date
from typing import Optional

from pydantic import BaseModel


class BillingCalculateRequest(BaseModel):
    session_id: int
    vat_percent: Decimal = 0
    discount_amount: Decimal = 0


class BillingBreakdown(BaseModel):
    game_charge: Decimal
    canteen_charge: Decimal
    subtotal: Decimal
    vat_percent: Decimal
    vat_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    duration_seconds: int
    rate_used: Decimal


class PaymentCreateRequest(BaseModel):
    session_id: int
    amount: Decimal
    method: str  # cash, card, credit, split
    status: str = "completed"
    customer_id: int | None = None
    customer_name: str | None = None
    customer_mobile: str | None = None


class PaymentSplitRequest(BaseModel):
    session_id: int
    payments: list[dict]  # [{"amount": 100, "method": "cash"}, ...]


class PaymentResponse(BaseModel):
    id: int
    session_id: int
    amount: Decimal
    method: str
    status: str

    model_config = {"from_attributes": True}


class OrderCreateRequest(BaseModel):
    session_id: int
    player_id: int
    product_id: int
    quantity: int = 1
    price: Optional[Decimal] = None  # omit to use product price


class OrderResponse(BaseModel):
    id: int
    session_id: int
    player_id: int
    product_id: int
    quantity: int
    price: Decimal

    model_config = {"from_attributes": True}


class CanteenBillBreakdown(BaseModel):
    """Breakdown for walk-in canteen-only bill."""

    canteen_charge: Decimal
    subtotal: Decimal
    vat_percent: Decimal
    vat_amount: Decimal
    discount_amount: Decimal
    total: Decimal
