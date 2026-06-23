"""Products API (v1): canteen CRUD with PATCH to edit product."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, RequireCashier
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.product import ProductCreate, ProductResponse
from app.schemas.product import ProductUpdate
from app.services.product_service import create_product, list_products, get_product, update_product

router = APIRouter(prefix="/products", tags=["Products"], dependencies=[RequireCashier])


@router.post("", response_model=SuccessResponse[ProductResponse], status_code=201)
def post_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = create_product(db, body, current_user.tenant_id)
    return SuccessResponse(data=ProductResponse.model_validate(product), message="Product created")


@router.get("", response_model=SuccessResponse[list[ProductResponse]])
def get_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_products(db, current_user.tenant_id, skip=skip, limit=limit)
    return SuccessResponse(data=[ProductResponse.model_validate(p) for p in items])


@router.get("/{product_id}", response_model=SuccessResponse[ProductResponse])
def get_one(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = get_product(db, product_id, current_user.tenant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=ProductResponse.model_validate(p))


@router.patch("/{product_id}", response_model=SuccessResponse[ProductResponse])
def patch_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit canteen product."""
    p = get_product(db, product_id, current_user.tenant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p = update_product(db, p, body)
    return SuccessResponse(data=ProductResponse.model_validate(p), message="Product updated")
