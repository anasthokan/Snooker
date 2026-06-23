"""
Game type and game unit schemas.
"""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class GameTypeBase(BaseModel):
    name: str
    billing_type: str
    icon: str | None = None
    status: str = "active"


class GameTypeCreate(GameTypeBase):
    pass


class GameTypeUpdate(BaseModel):
    name: str | None = None
    billing_type: str | None = None
    icon: str | None = None
    status: str | None = None


class GameTypeResponse(GameTypeBase):
    id: int
    tenant_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class GameUnitBase(BaseModel):
    game_type_id: int
    unit_name: str
    weekday_price: Decimal = 0
    weekend_price: Decimal = 0
    special_price: Decimal | None = None
    status: str = "active"


class GameUnitCreate(GameUnitBase):
    pass


class GameUnitUpdate(BaseModel):
    game_type_id: int | None = None
    unit_name: str | None = None
    weekday_price: Decimal | None = None
    weekend_price: Decimal | None = None
    special_price: Decimal | None = None
    status: str | None = None


class GameUnitResponse(GameUnitBase):
    id: int
    tenant_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
