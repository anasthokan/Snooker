

"""Session schemas (v1): SessionDetailResponse includes orders (canteen) so going back to session shows saved items."""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.schemas.billing import OrderResponse


class SessionStartRequest(BaseModel):
    game_type_id: int
    game_unit_id: int


class SessionPlayerInput(BaseModel):
    name: str
    mobile: str | None = None
    membership_id: str | None = None


class SessionStartWithPlayersRequest(BaseModel):
    game_type_id: int
    game_unit_id: int
    players: list[SessionPlayerInput]


class SessionStartResponse(BaseModel):
    session_id: int
    game_type_id: int
    game_unit_id: int
    start_time: datetime
    status: str
    model_config = {"from_attributes": True}


class SessionPauseRequest(BaseModel):
    session_id: int


class SessionResumeRequest(BaseModel):
    session_id: int


class SessionEndRequest(BaseModel):
    session_id: int


class PlayerAddRequest(BaseModel):
    session_id: int
    name: str
    mobile: str | None = None
    membership_id: str | None = None


class SessionPlayerResponse(BaseModel):
    id: int
    session_id: int
    name: str
    mobile: str | None
    membership_id: str | None
    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: int
    tenant_id: int
    game_type_id: int
    game_unit_id: int
    start_time: datetime
    end_time: datetime | None
    paused_seconds: int
    status: str
    total_charge: Decimal | None
    duration_seconds: int | None = None
    model_config = {"from_attributes": True}


class SessionDetailResponse(SessionResponse):
    """Session with players and canteen orders (so UI can show saved items when going back)."""
    players: list[SessionPlayerResponse] = []
    orders: list[OrderResponse] = []
