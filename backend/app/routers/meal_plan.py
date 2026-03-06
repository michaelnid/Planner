from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MealPlan, Recipe, RecipeIngredient, User, MealPlanTemplate, MealPlanTemplateItem
from app.schemas import (
    MealPlanCreate, MealPlanResponse, DayPlanResponse, WeekPlanResponse,
    MealPlanTemplateCreate, MealPlanTemplateResponse, MealPlanTemplateItemResponse
)
from app.auth.dependencies import get_current_user
from app.routers.recipes import _calculate_nutrition

router = APIRouter(prefix="/api/meal-plan", tags=["Wochenplanung"])

MEAL_SLOTS = ["fruehstueck", "mittagessen", "abendessen", "snack"]


def _get_week_bounds(ref_date: date) -> tuple[date, date]:
    """Berechnet Montag und Sonntag der Woche für ein gegebenes Datum."""
    monday = ref_date - timedelta(days=ref_date.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _meal_plan_to_response(mp: MealPlan) -> MealPlanResponse:
    nutrition = _calculate_nutrition(mp.recipe) if mp.recipe else {}
    return MealPlanResponse(
        id=mp.id,
        plan_date=mp.plan_date,
        meal_slot=mp.meal_slot,
        recipe_id=mp.recipe_id,
        recipe_name=mp.recipe.name if mp.recipe else None,
        recipe_kcal=nutrition.get("kcal_total", 0),
        recipe_protein=nutrition.get("protein_total", 0),
        recipe_fat=nutrition.get("fat_total", 0),
        recipe_carbs=nutrition.get("carbs_total", 0),
        recipe_prep_time=mp.recipe.prep_time_minutes if mp.recipe else None,
    )


@router.get("/week", response_model=WeekPlanResponse)
def get_week_plan(
    week_offset: int = Query(0, description="0 = aktuelle Woche, 1 = naechste, -1 = vorherige"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    monday, sunday = _get_week_bounds(ref_date)

    plans = (
        db.query(MealPlan)
        .filter(
            MealPlan.user_id == current_user.id,
            MealPlan.plan_date >= monday,
            MealPlan.plan_date <= sunday,
        )
        .all()
    )

    # Group by date
    plans_by_date: dict[date, dict[str, MealPlan]] = {}
    for mp in plans:
        if mp.plan_date not in plans_by_date:
            plans_by_date[mp.plan_date] = {}
        plans_by_date[mp.plan_date][mp.meal_slot] = mp

    days = []
    week_kcal = 0
    week_protein = 0
    week_fat = 0
    week_carbs = 0

    for i in range(7):
        current_date = monday + timedelta(days=i)
        day_meals = plans_by_date.get(current_date, {})

        meals = {}
        day_kcal = 0
        day_protein = 0
        day_fat = 0
        day_carbs = 0
        day_prep = 0

        for slot in MEAL_SLOTS:
            mp = day_meals.get(slot)
            if mp:
                resp = _meal_plan_to_response(mp)
                meals[slot] = resp
                day_kcal += resp.recipe_kcal
                day_protein += resp.recipe_protein
                day_fat += resp.recipe_fat
                day_carbs += resp.recipe_carbs
                day_prep += resp.recipe_prep_time or 0
            else:
                meals[slot] = None

        days.append(DayPlanResponse(
            date=current_date,
            meals=meals,
            total_kcal=round(day_kcal, 1),
            total_protein=round(day_protein, 1),
            total_fat=round(day_fat, 1),
            total_carbs=round(day_carbs, 1),
            total_prep_time=day_prep,
        ))

        week_kcal += day_kcal
        week_protein += day_protein
        week_fat += day_fat
        week_carbs += day_carbs

    return WeekPlanResponse(
        week_start=monday,
        week_end=sunday,
        days=days,
        week_total_kcal=round(week_kcal, 1),
        week_total_protein=round(week_protein, 1),
        week_total_fat=round(week_fat, 1),
        week_total_carbs=round(week_carbs, 1),
    )


@router.post("", response_model=MealPlanResponse, status_code=201)
def set_meal(
    data: MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.meal_slot not in MEAL_SLOTS:
        raise HTTPException(status_code=400, detail=f"Ungueltige Mahlzeit. Erlaubt: {MEAL_SLOTS}")

    recipe = db.query(Recipe).filter(Recipe.id == data.recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    # Upsert: existing entry for this slot?
    existing = (
        db.query(MealPlan)
        .filter(
            MealPlan.user_id == current_user.id,
            MealPlan.plan_date == data.plan_date,
            MealPlan.meal_slot == data.meal_slot,
        )
        .first()
    )

    if existing:
        existing.recipe_id = data.recipe_id
        db.commit()
        db.refresh(existing)
        return _meal_plan_to_response(existing)

    mp = MealPlan(
        user_id=current_user.id,
        plan_date=data.plan_date,
        meal_slot=data.meal_slot,
        recipe_id=data.recipe_id,
    )
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return _meal_plan_to_response(mp)


@router.delete("/{meal_plan_id}")
def remove_meal(
    meal_plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mp = db.query(MealPlan).filter(
        MealPlan.id == meal_plan_id,
        MealPlan.user_id == current_user.id,
    ).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    db.delete(mp)
    db.commit()
    return {"message": "Eintrag entfernt"}


# ─── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[MealPlanTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    templates = (
        db.query(MealPlanTemplate)
        .filter(MealPlanTemplate.user_id == current_user.id)
        .order_by(MealPlanTemplate.name)
        .all()
    )
    result = []
    for t in templates:
        items = []
        for item in t.items:
            items.append(MealPlanTemplateItemResponse(
                id=item.id,
                day_of_week=item.day_of_week,
                meal_slot=item.meal_slot,
                recipe_id=item.recipe_id,
                recipe_name=item.recipe.name if item.recipe else None,
            ))
        result.append(MealPlanTemplateResponse(
            id=t.id,
            name=t.name,
            items=items,
            created_at=t.created_at,
        ))
    return result


@router.post("/templates", response_model=MealPlanTemplateResponse, status_code=201)
def create_template(
    data: MealPlanTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = MealPlanTemplate(
        name=data.name,
        user_id=current_user.id,
    )
    db.add(template)
    db.flush()

    for item_data in data.items:
        item = MealPlanTemplateItem(
            template_id=template.id,
            day_of_week=item_data.day_of_week,
            meal_slot=item_data.meal_slot,
            recipe_id=item_data.recipe_id,
        )
        db.add(item)

    db.commit()
    db.refresh(template)
    return template


@router.post("/templates/{template_id}/apply")
def apply_template(
    template_id: int,
    week_offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MealPlanTemplate).filter(
        MealPlanTemplate.id == template_id,
        MealPlanTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")

    today = date.today()
    ref_date = today + timedelta(weeks=week_offset)
    monday, _ = _get_week_bounds(ref_date)

    applied = 0
    for item in template.items:
        plan_date = monday + timedelta(days=item.day_of_week)

        existing = db.query(MealPlan).filter(
            MealPlan.user_id == current_user.id,
            MealPlan.plan_date == plan_date,
            MealPlan.meal_slot == item.meal_slot,
        ).first()

        if existing:
            existing.recipe_id = item.recipe_id
        else:
            mp = MealPlan(
                user_id=current_user.id,
                plan_date=plan_date,
                meal_slot=item.meal_slot,
                recipe_id=item.recipe_id,
            )
            db.add(mp)
        applied += 1

    db.commit()
    return {"message": f"{applied} Mahlzeiten angewendet"}


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MealPlanTemplate).filter(
        MealPlanTemplate.id == template_id,
        MealPlanTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")
    db.delete(template)
    db.commit()
    return {"message": "Template geloescht"}
