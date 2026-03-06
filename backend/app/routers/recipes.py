import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Recipe, RecipeCategory, RecipeIngredient, Product, User
from app.schemas import (
    RecipeCreate, RecipeUpdate, RecipeResponse,
    RecipeIngredientResponse,
    RecipeCategoryCreate, RecipeCategoryResponse
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/recipes", tags=["Rezepte"])


def _calculate_nutrition(recipe: Recipe) -> dict:
    """Berechnet Nährwerte aus Zutaten oder nutzt Override-Werte."""
    kcal = recipe.kcal_override or 0
    protein = recipe.protein_override or 0
    fat = recipe.fat_override or 0
    carbs = recipe.carbs_override or 0

    if not recipe.kcal_override:
        for ing in recipe.ingredients:
            if ing.product:
                kcal += (ing.product.kcal_per_unit or 0) * ing.quantity
                protein += (ing.product.protein_per_unit or 0) * ing.quantity
                fat += (ing.product.fat_per_unit or 0) * ing.quantity
                carbs += (ing.product.carbs_per_unit or 0) * ing.quantity

    return {
        "kcal_total": round(kcal, 1),
        "protein_total": round(protein, 1),
        "fat_total": round(fat, 1),
        "carbs_total": round(carbs, 1),
    }


def _recipe_to_response(recipe: Recipe) -> RecipeResponse:
    nutrition = _calculate_nutrition(recipe)
    ingredients = []
    for ing in recipe.ingredients:
        ingredients.append(RecipeIngredientResponse(
            id=ing.id,
            product_id=ing.product_id,
            product_name=ing.product.name if ing.product else None,
            product_unit=ing.product.unit if ing.product else None,
            quantity=ing.quantity,
        ))

    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        category_id=recipe.category_id,
        category_name=recipe.category.name if recipe.category else None,
        servings=recipe.servings,
        kcal_total=nutrition["kcal_total"],
        protein_total=nutrition["protein_total"],
        fat_total=nutrition["fat_total"],
        carbs_total=nutrition["carbs_total"],
        prep_time_minutes=recipe.prep_time_minutes,
        notes=recipe.notes,
        is_favorite=recipe.is_favorite,
        image_path=recipe.image_path,
        created_by=recipe.created_by,
        creator_name=recipe.creator.username if recipe.creator else None,
        ingredients=ingredients,
        created_at=recipe.created_at,
    )


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[RecipeCategoryResponse])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(RecipeCategory).order_by(RecipeCategory.sort_order).all()


@router.post("/categories", response_model=RecipeCategoryResponse, status_code=201)
def create_category(
    data: RecipeCategoryCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(RecipeCategory).filter(RecipeCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    cat = RecipeCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ─── Recipes ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[RecipeResponse])
def list_recipes(
    search: str = Query(None),
    category_id: int = Query(None),
    favorites_only: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Recipe)
    if search:
        query = query.filter(Recipe.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Recipe.category_id == category_id)
    if favorites_only:
        query = query.filter(Recipe.is_favorite == True)

    recipes = query.order_by(Recipe.name).all()
    return [_recipe_to_response(r) for r in recipes]


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    return _recipe_to_response(recipe)


@router.post("", response_model=RecipeResponse, status_code=201)
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = Recipe(
        name=data.name,
        category_id=data.category_id,
        servings=data.servings,
        kcal_override=data.kcal_override,
        protein_override=data.protein_override,
        fat_override=data.fat_override,
        carbs_override=data.carbs_override,
        prep_time_minutes=data.prep_time_minutes,
        notes=data.notes,
        is_favorite=data.is_favorite,
        created_by=current_user.id,
    )
    db.add(recipe)
    db.flush()

    for ing_data in data.ingredients:
        product = db.query(Product).filter(Product.id == ing_data.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Produkt {ing_data.product_id} nicht gefunden")
        ing = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=ing_data.product_id,
            quantity=ing_data.quantity,
        )
        db.add(ing)

    db.commit()
    db.refresh(recipe)
    return _recipe_to_response(recipe)


@router.put("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    ingredients_data = update_data.pop("ingredients", None)

    for key, value in update_data.items():
        setattr(recipe, key, value)

    # Update ingredients if provided
    if ingredients_data is not None:
        # Delete old ingredients
        db.query(RecipeIngredient).filter(
            RecipeIngredient.recipe_id == recipe_id
        ).delete()

        # Add new ones
        for ing_data in ingredients_data:
            ing = RecipeIngredient(
                recipe_id=recipe_id,
                product_id=ing_data["product_id"],
                quantity=ing_data["quantity"],
            )
            db.add(ing)

    db.commit()
    db.refresh(recipe)
    return _recipe_to_response(recipe)


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    db.delete(recipe)
    db.commit()
    return {"message": "Rezept geloescht"}


@router.put("/{recipe_id}/favorite")
def toggle_favorite(
    recipe_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    recipe.is_favorite = not recipe.is_favorite
    db.commit()
    return {"is_favorite": recipe.is_favorite}


@router.post("/{recipe_id}/image")
async def upload_recipe_image(
    recipe_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nur JPEG, PNG, oder WebP Bilder erlaubt")

    # Save file
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"recipe_{recipe_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    # Delete old image if exists
    if recipe.image_path:
        old_path = os.path.join(settings.UPLOAD_DIR, recipe.image_path)
        if os.path.exists(old_path):
            os.remove(old_path)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    recipe.image_path = filename
    db.commit()

    return {"image_path": filename}
