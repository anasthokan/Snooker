"""
Billing schemas v1: extends billing with canteen-only bill support.
"""
from decimal import Decimal
from datetime import date

from pydantic import BaseModel


# Re-export from billing for compatibility
from app.schemas.billing import (
    BillingCalculateRequest,
    BillingBreakdown,
    PaymentCreateRequest,
    PaymentSplitRequest,
    PaymentResponse,
    OrderCreateRequest,
    OrderResponse,
    CanteenBillBreakdown,
)
