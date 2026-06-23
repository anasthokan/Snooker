
"""Product schemas (v1): add ProductUpdate for editing canteen products."""
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    price: Decimal = 0
    category: str | None = None
    status: str = "active"


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    price: Decimal | None = None
    category: str | None = None
    status: str | None = None


class ProductResponse(ProductBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}
