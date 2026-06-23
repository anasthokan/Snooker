"""
User and role schemas.
"""
from datetime import datetime
from pydantic import BaseModel, field_validator


class RoleBase(BaseModel):
    name: str


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBase(BaseModel):
    email: str
    role_id: int
    tenant_id: int
    is_active: bool = True


class UserCreate(BaseModel):
    email: str
    password: str
    role_id: int
    tenant_id: int
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def email_clean(cls, v: str) -> str:
        return (v or "").strip().lower()


class UserUpdate(BaseModel):
    email: str | None = None
    role_id: int | None = None
    tenant_id: int | None = None
    is_active: bool | None = None
    password: str | None = None

    @field_validator("email")
    @classmethod
    def email_clean(cls, v: str | None) -> str | None:
        return (v or "").strip().lower() if v else None


class UserResponse(BaseModel):
    id: int
    email: str
    role_id: int
    tenant_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
