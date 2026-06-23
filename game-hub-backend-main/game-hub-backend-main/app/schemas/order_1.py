"""
Order schemas v1: optional session/player for canteen orders.
Supports both player orders (session+player) and walk-in orders (customer_name+mobile).
"""
from decimal import Decimal

from pydantic import BaseModel, model_validator


class OrderItemInput(BaseModel):
    """Single item for canteen order."""

    product_id: int
    quantity: int = 1


class OrderCreateRequestV2(BaseModel):
    """
    Create canteen order. Two modes:
    - Player: session_id + player_id required; product_id, quantity, price
    - Walk-in: customer_name + customer_mobile + items required; no session/player
    """

    # Player order fields (optional)
    session_id: int | None = None
    player_id: int | None = None
    product_id: int | None = None
    quantity: int = 1
    price: Decimal | None = None

    # Walk-in order fields (optional)
    customer_name: str | None = None
    customer_mobile: str | None = None
    items: list[OrderItemInput] | None = None

    @model_validator(mode="after")
    def validate_mode(self):
        has_player = self.session_id is not None and self.player_id is not None
        has_walkin = self.customer_name and (self.items and len(self.items) > 0)

        if has_player and has_walkin:
            raise ValueError("Provide either session_id+player_id OR customer_name+items, not both")
        if has_player:
            if self.product_id is None:
                raise ValueError("product_id required for player order")
            # price optional - will use product price if not provided
        elif has_walkin:
            if not self.customer_name or not self.customer_name.strip():
                raise ValueError("customer_name required for walk-in order")
            if not self.items or len(self.items) == 0:
                raise ValueError("items required for walk-in order")
        else:
            raise ValueError(
                "Provide either (session_id, player_id, product_id, price) for player order "
                "OR (customer_name, items) for walk-in order"
            )
        return self


class OrderResponseV2(BaseModel):
    """Order response - supports both PlayerOrder and CanteenBill."""

    id: int
    type: str  # "player" | "walk_in"
    session_id: int | None = None
    player_id: int | None = None
    canteen_bill_id: int | None = None
    product_id: int | None = None
    quantity: int = 1
    price: Decimal | None = None
    customer_name: str | None = None
    customer_mobile: str | None = None

    model_config = {"from_attributes": True}


class CanteenOrderCreateRequest(BaseModel):
    """Walk-in canteen order: customer info + list of items."""

    customer_name: str
    customer_mobile: str | None = None
    items: list[OrderItemInput]


class CanteenBillResponse(BaseModel):
    """Response after creating walk-in canteen order."""

    id: int
    customer_name: str
    customer_mobile: str | None
    items_count: int
    subtotal: Decimal
    vat_amount: Decimal
    total: Decimal

    model_config = {"from_attributes": True}
