"""
Tenant schemas.
"""
from datetime import datetime
from pydantic import BaseModel


class TenantBase(BaseModel):
    name: str
    status: str = "active"
    subscription_plan: str | None = None
    vat_no: str | None = None
    cr_no: str | None = None
    invoice_logo_url: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    subscription_plan: str | None = None
    vat_no: str | None = None
    cr_no: str | None = None
    invoice_logo_url: str | None = None


class TenantResponse(BaseModel):
    id: int
    name: str
    status: str
    subscription_plan: str | None
    vat_no: str | None
    cr_no: str | None
    invoice_logo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
