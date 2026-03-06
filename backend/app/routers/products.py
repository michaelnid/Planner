from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, ProductCategory
from app.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductCategoryCreate, ProductCategoryResponse
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/products", tags=["Produkte"])


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[ProductCategoryResponse])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(ProductCategory).order_by(ProductCategory.sort_order).all()


@router.post("/categories", response_model=ProductCategoryResponse, status_code=201)
def create_category(
    data: ProductCategoryCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(ProductCategory).filter(ProductCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    cat = ProductCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ─── Products ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProductResponse])
def list_products(
    search: str = Query(None),
    category_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Product)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    products = query.order_by(Product.name).all()

    result = []
    for p in products:
        resp = ProductResponse.model_validate(p)
        resp.category_name = p.category.name if p.category else None
        result.append(resp)
    return result


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    resp = ProductResponse.model_validate(p)
    resp.category_name = p.category.name if p.category else None
    return resp


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    resp = ProductResponse.model_validate(product)
    resp.category_name = product.category.name if product.category else None
    return resp


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    resp = ProductResponse.model_validate(product)
    resp.category_name = product.category.name if product.category else None
    return resp


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    db.delete(product)
    db.commit()
    return {"message": "Produkt geloescht"}
