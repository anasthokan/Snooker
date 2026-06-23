"""
Customer schemas: CRUD request/response.
"""
from datetime import datetime

from pydantic import BaseModel


class CustomerBase(BaseModel):
    name: str
    mobile: str | None = None
    email: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    mobile: str | None = None
    email: str | None = None


class CustomerResponse(CustomerBase):
    id: int
    tenant_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
