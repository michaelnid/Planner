from datetime import date, datetime
from pydantic import BaseModel, field_validator


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_min_length(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Benutzername muss mindestens 3 Zeichen lang sein")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Passwort muss mindestens 8 Zeichen lang sein")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if v is not None and len(v) < 8:
            raise ValueError("Passwort muss mindestens 8 Zeichen lang sein")
        return v


# ─── Product Categories ──────────────────────────────────────────────────────

class ProductCategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


class ProductCategoryResponse(BaseModel):
    id: int
    name: str
    sort_order: int

    class Config:
        from_attributes = True


# ─── Products ─────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    unit: str
    category_id: int | None = None
    kcal_per_unit: float | None = 0
    protein_per_unit: float | None = 0
    fat_per_unit: float | None = 0
    carbs_per_unit: float | None = 0


class ProductUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    category_id: int | None = None
    kcal_per_unit: float | None = None
    protein_per_unit: float | None = None
    fat_per_unit: float | None = None
    carbs_per_unit: float | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    unit: str
    category_id: int | None = None
    category_name: str | None = None
    kcal_per_unit: float | None = 0
    protein_per_unit: float | None = 0
    fat_per_unit: float | None = 0
    carbs_per_unit: float | None = 0

    class Config:
        from_attributes = True


# ─── Recipe Categories ────────────────────────────────────────────────────────

class RecipeCategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


class RecipeCategoryResponse(BaseModel):
    id: int
    name: str
    sort_order: int

    class Config:
        from_attributes = True


# ─── Recipes ──────────────────────────────────────────────────────────────────

class RecipeIngredientCreate(BaseModel):
    product_id: int
    quantity: float


class RecipeIngredientResponse(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    product_unit: str | None = None
    quantity: float

    class Config:
        from_attributes = True


class RecipeCreate(BaseModel):
    name: str
    category_id: int | None = None
    servings: int = 1
    kcal_override: float | None = None
    protein_override: float | None = None
    fat_override: float | None = None
    carbs_override: float | None = None
    prep_time_minutes: int | None = None
    notes: str | None = None
    is_favorite: bool = False
    ingredients: list[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    servings: int | None = None
    kcal_override: float | None = None
    protein_override: float | None = None
    fat_override: float | None = None
    carbs_override: float | None = None
    prep_time_minutes: int | None = None
    notes: str | None = None
    is_favorite: bool | None = None
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeResponse(BaseModel):
    id: int
    name: str
    category_id: int | None = None
    category_name: str | None = None
    servings: int
    kcal_total: float = 0
    protein_total: float = 0
    fat_total: float = 0
    carbs_total: float = 0
    prep_time_minutes: int | None = None
    notes: str | None = None
    is_favorite: bool
    image_path: str | None = None
    created_by: int | None = None
    creator_name: str | None = None
    ingredients: list[RecipeIngredientResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Meal Plan ────────────────────────────────────────────────────────────────

class MealPlanCreate(BaseModel):
    plan_date: date
    meal_slot: str  # fruehstueck, mittagessen, abendessen, snack
    recipe_id: int


class MealPlanResponse(BaseModel):
    id: int
    plan_date: date
    meal_slot: str
    recipe_id: int
    recipe_name: str | None = None
    recipe_kcal: float = 0
    recipe_protein: float = 0
    recipe_fat: float = 0
    recipe_carbs: float = 0
    recipe_prep_time: int | None = None

    class Config:
        from_attributes = True


class DayPlanResponse(BaseModel):
    date: date
    meals: dict[str, MealPlanResponse | None]
    total_kcal: float = 0
    total_protein: float = 0
    total_fat: float = 0
    total_carbs: float = 0
    total_prep_time: int = 0


class WeekPlanResponse(BaseModel):
    week_start: date
    week_end: date
    days: list[DayPlanResponse]
    week_total_kcal: float = 0
    week_total_protein: float = 0
    week_total_fat: float = 0
    week_total_carbs: float = 0


# ─── Shopping List ────────────────────────────────────────────────────────────

class ShoppingItemCreate(BaseModel):
    product_id: int | None = None
    custom_name: str | None = None
    quantity: float | None = None
    unit: str | None = None


class ShoppingItemResponse(BaseModel):
    id: int
    product_id: int | None = None
    product_name: str | None = None
    product_category: str | None = None
    custom_name: str | None = None
    quantity: float | None = None
    unit: str | None = None
    is_checked: bool

    class Config:
        from_attributes = True


class ShoppingItemUpdate(BaseModel):
    is_checked: bool | None = None
    quantity: float | None = None


# ─── Meal Plan Templates ─────────────────────────────────────────────────────

class MealPlanTemplateItemCreate(BaseModel):
    day_of_week: int  # 0=Mo, 6=So
    meal_slot: str
    recipe_id: int


class MealPlanTemplateCreate(BaseModel):
    name: str
    items: list[MealPlanTemplateItemCreate] = []


class MealPlanTemplateItemResponse(BaseModel):
    id: int
    day_of_week: int
    meal_slot: str
    recipe_id: int
    recipe_name: str | None = None

    class Config:
        from_attributes = True


class MealPlanTemplateResponse(BaseModel):
    id: int
    name: str
    items: list[MealPlanTemplateItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True
