"""
Customer auth and portal schemas.
"""
from decimal import Decimal

from pydantic import BaseModel, field_validator


class CustomerSignupRequest(BaseModel):
    tenant_id: int | None = None
    name: str
    mobile: str
    password: str
    email: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Name is required")
        return v


class CustomerLoginRequest(BaseModel):
    tenant_id: int | None = None
    mobile: str
    password: str


class CustomerInfo(BaseModel):
    id: int
    name: str
    mobile: str | None = None
    email: str | None = None
    tenant_id: int


class CustomerAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    customer: CustomerInfo


class CustomerTableItem(BaseModel):
    unit_id: int
    game_type_id: int
    game_type_name: str
    unit_name: str
    weekday_price: Decimal
    weekend_price: Decimal
    status: str
    session_id: int | None = None


class CustomerStartSessionRequest(BaseModel):
    game_type_id: int
    game_unit_id: int


class CustomerOrderRequest(BaseModel):
    session_id: int
    product_id: int
    quantity: int = 1
    player_id: int | None = None


class CustomerCheckoutRequest(BaseModel):
    payment_method: str = "credit"  # credit | cash | card
    vat_percent: Decimal = Decimal("15")
    discount_amount: Decimal = Decimal("0")


class CustomerFloorResponse(BaseModel):
    tenant_name: str
    tables: list[CustomerTableItem]
