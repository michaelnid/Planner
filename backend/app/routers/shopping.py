from datetime import date, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ShoppingItem, MealPlan, RecipeIngredient, Product, User
from app.schemas import ShoppingItemCreate, ShoppingItemResponse, ShoppingItemUpdate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/shopping", tags=["Einkauf"])


def _get_week_start(ref_date: date) -> date:
    return ref_date - timedelta(days=ref_date.weekday())


@router.get("", response_model=list[ShoppingItemResponse])
def get_shopping_list(
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    week_start = _get_week_start(ref_date)

    items = (
        db.query(ShoppingItem)
        .filter(
            ShoppingItem.user_id == current_user.id,
            ShoppingItem.week_start == week_start,
        )
        .all()
    )

    result = []
    for item in items:
        result.append(ShoppingItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name if item.product else None,
            product_category=item.product.category.name if item.product and item.product.category else None,
            custom_name=item.custom_name,
            quantity=item.quantity,
            unit=item.unit,
            is_checked=item.is_checked,
        ))

    # Sortiert nach Kategorie, dann Name
    result.sort(key=lambda x: (x.product_category or "ZZZ", x.product_name or x.custom_name or ""))
    return result


@router.post("/generate")
def generate_from_meal_plan(
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generiert die Einkaufsliste automatisch aus der Wochenplanung."""
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    week_start = _get_week_start(ref_date)
    week_end = week_start + timedelta(days=6)

    # Alle Meal-Plan Eintraege der Woche holen
    meal_plans = (
        db.query(MealPlan)
        .filter(
            MealPlan.user_id == current_user.id,
            MealPlan.plan_date >= week_start,
            MealPlan.plan_date <= week_end,
        )
        .all()
    )

    # Mengen zusammenrechnen
    product_totals: dict[int, float] = defaultdict(float)
    for mp in meal_plans:
        if mp.recipe:
            for ing in mp.recipe.ingredients:
                product_totals[ing.product_id] += ing.quantity

    # Alte automatisch generierte Items loeschen (nur die ohne custom_name)
    db.query(ShoppingItem).filter(
        ShoppingItem.user_id == current_user.id,
        ShoppingItem.week_start == week_start,
        ShoppingItem.custom_name == None,
    ).delete()

    # Neue Items erstellen
    created = 0
    for product_id, total_qty in product_totals.items():
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            item = ShoppingItem(
                user_id=current_user.id,
                product_id=product_id,
                quantity=round(total_qty, 2),
                unit=product.unit,
                is_checked=False,
                week_start=week_start,
            )
            db.add(item)
            created += 1

    db.commit()
    return {"message": f"Einkaufsliste generiert: {created} Produkte"}


@router.post("", response_model=ShoppingItemResponse, status_code=201)
def add_shopping_item(
    data: ShoppingItemCreate,
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    week_start = _get_week_start(ref_date)

    item = ShoppingItem(
        user_id=current_user.id,
        product_id=data.product_id,
        custom_name=data.custom_name,
        quantity=data.quantity,
        unit=data.unit,
        week_start=week_start,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return ShoppingItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name if item.product else None,
        product_category=item.product.category.name if item.product and item.product.category else None,
        custom_name=item.custom_name,
        quantity=item.quantity,
        unit=item.unit,
        is_checked=item.is_checked,
    )


@router.put("/{item_id}", response_model=ShoppingItemResponse)
def update_shopping_item(
    item_id: int,
    data: ShoppingItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShoppingItem).filter(
        ShoppingItem.id == item_id,
        ShoppingItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")

    if data.is_checked is not None:
        item.is_checked = data.is_checked
    if data.quantity is not None:
        item.quantity = data.quantity

    db.commit()
    db.refresh(item)

    return ShoppingItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name if item.product else None,
        product_category=item.product.category.name if item.product and item.product.category else None,
        custom_name=item.custom_name,
        quantity=item.quantity,
        unit=item.unit,
        is_checked=item.is_checked,
    )


@router.put("/check-all")
def check_all(
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    week_start = _get_week_start(ref_date)

    db.query(ShoppingItem).filter(
        ShoppingItem.user_id == current_user.id,
        ShoppingItem.week_start == week_start,
    ).update({"is_checked": True})
    db.commit()
    return {"message": "Alle abgehakt"}


@router.put("/uncheck-all")
def uncheck_all(
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    week_start = _get_week_start(ref_date)

    db.query(ShoppingItem).filter(
        ShoppingItem.user_id == current_user.id,
        ShoppingItem.week_start == week_start,
    ).update({"is_checked": False})
    db.commit()
    return {"message": "Alle zurueckgesetzt"}


@router.delete("/{item_id}")
def delete_shopping_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShoppingItem).filter(
        ShoppingItem.id == item_id,
        ShoppingItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    db.delete(item)
    db.commit()
    return {"message": "Eintrag entfernt"}
