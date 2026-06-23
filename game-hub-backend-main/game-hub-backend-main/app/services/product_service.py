
"""Product service (v1): CRUD + update_product for editing canteen items."""
from typing import Sequence
from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate
from app.schemas.product import ProductUpdate


def create_product(db: Session, data: ProductCreate, tenant_id: int) -> Product:
    p = Product(
        tenant_id=tenant_id,
        name=data.name,
        price=data.price,
        category=data.category,
        status=data.status,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def list_products(db: Session, tenant_id: int, skip: int = 0, limit: int = 100) -> Sequence[Product]:
    return db.query(Product).filter(Product.tenant_id == tenant_id).offset(skip).limit(limit).all()


def get_product(db: Session, product_id: int, tenant_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id, Product.tenant_id == tenant_id).first()


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    """Update product fields."""
    if data.name is not None:
        product.name = data.name
    if data.price is not None:
        product.price = data.price
    if data.category is not None:
        product.category = data.category
    if data.status is not None:
        product.status = data.status
    db.commit()
    db.refresh(product)
    return product
