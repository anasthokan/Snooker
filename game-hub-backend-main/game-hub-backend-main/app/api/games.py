"""
Games API (v1): types + units with DELETE unit and available_only filter for units.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.game import (
    GameTypeCreate,
    GameTypeUpdate,
    GameTypeResponse,
    GameUnitCreate,
    GameUnitUpdate,
    GameUnitResponse,
)
from app.services.game_service import (
    create_game_type,
    get_game_type_by_id,
    list_game_types,
    update_game_type,
    create_game_unit,
    get_game_unit_by_id,
    list_game_units,
    update_game_unit,
    delete_game_unit,
)

router = APIRouter(prefix="/games", tags=["Games"], dependencies=[RequireCashier])


@router.post("/types", response_model=SuccessResponse[GameTypeResponse], status_code=201)
def post_game_type(
    body: GameTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a game type (e.g. PC, PlayStation)."""
    gt = create_game_type(db, body, current_user.tenant_id)
    return SuccessResponse(data=GameTypeResponse.model_validate(gt), message="Game type created")


@router.get("/types", response_model=SuccessResponse[list[GameTypeResponse]])
def get_game_types(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List game types for current tenant."""
    items = list_game_types(db, current_user.tenant_id, skip=skip, limit=limit)
    return SuccessResponse(data=[GameTypeResponse.model_validate(t) for t in items])


@router.get("/types/{game_type_id}", response_model=SuccessResponse[GameTypeResponse])
def get_game_type(
    game_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get one game type by id."""
    gt = get_game_type_by_id(db, game_type_id, current_user.tenant_id)
    if not gt:
        raise HTTPException(status_code=404, detail="Game type not found")
    return SuccessResponse(data=GameTypeResponse.model_validate(gt))


@router.patch("/types/{game_type_id}", response_model=SuccessResponse[GameTypeResponse])
def patch_game_type(
    game_type_id: int,
    body: GameTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update game type."""
    gt = get_game_type_by_id(db, game_type_id, current_user.tenant_id)
    if not gt:
        raise HTTPException(status_code=404, detail="Game type not found")
    gt = update_game_type(db, gt, body)
    return SuccessResponse(data=GameTypeResponse.model_validate(gt), message="Game type updated")


@router.post("/units", response_model=SuccessResponse[GameUnitResponse], status_code=201)
def post_game_unit(
    body: GameUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a game unit (seat/console) under a game type."""
    gt = get_game_type_by_id(db, body.game_type_id, current_user.tenant_id)
    if not gt:
        raise HTTPException(status_code=404, detail="Game type not found")
    gu = create_game_unit(db, body, current_user.tenant_id)
    return SuccessResponse(data=GameUnitResponse.model_validate(gu), message="Game unit created")


@router.get("/units", response_model=SuccessResponse[list[GameUnitResponse]])
def get_game_units(
    game_type_id: int | None = None,
    status: str | None = None,
    available_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List game units. Use available_only=true to exclude occupied units (for 'Select available unit' dropdown)."""
    items = list_game_units(
        db,
        current_user.tenant_id,
        game_type_id=game_type_id,
        status=status,
        available_only=available_only,
        skip=skip,
        limit=limit,
    )
    return SuccessResponse(data=[GameUnitResponse.model_validate(u) for u in items])


@router.get("/units/{unit_id}", response_model=SuccessResponse[GameUnitResponse])
def get_game_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get one game unit by id."""
    gu = get_game_unit_by_id(db, unit_id, current_user.tenant_id)
    if not gu:
        raise HTTPException(status_code=404, detail="Game unit not found")
    return SuccessResponse(data=GameUnitResponse.model_validate(gu))


@router.patch("/units/{unit_id}", response_model=SuccessResponse[GameUnitResponse])
def patch_game_unit(
    unit_id: int,
    body: GameUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update game unit."""
    gu = get_game_unit_by_id(db, unit_id, current_user.tenant_id)
    if not gu:
        raise HTTPException(status_code=404, detail="Game unit not found")
    gu = update_game_unit(db, gu, body)
    return SuccessResponse(data=GameUnitResponse.model_validate(gu), message="Game unit updated")


@router.delete("/units/{unit_id}", response_model=SuccessResponse[dict])
def delete_one_game_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove game unit (soft-delete: sets status to disabled)."""
    ok = delete_game_unit(db, unit_id, current_user.tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Game unit not found")
    return SuccessResponse(data={}, message="Game unit removed")
