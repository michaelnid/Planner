from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, Date, DateTime,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


# ─── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    recipes = relationship("Recipe", back_populates="creator")
    meal_plans = relationship("MealPlan", back_populates="user")
    shopping_items = relationship("ShoppingItem", back_populates="user")


# ─── Product Categories ──────────────────────────────────────────────────────

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sort_order = Column(Integer, default=0)

    products = relationship("Product", back_populates="category")


# ─── Products ─────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    unit = Column(String(20), nullable=False)  # Stk, g, ml, kg, l, EL, TL, Prise
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    kcal_per_unit = Column(Float, nullable=True, default=0)
    protein_per_unit = Column(Float, nullable=True, default=0)
    fat_per_unit = Column(Float, nullable=True, default=0)
    carbs_per_unit = Column(Float, nullable=True, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("ProductCategory", back_populates="products")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="product")
    shopping_items = relationship("ShoppingItem", back_populates="product")


# ─── Recipe Categories ────────────────────────────────────────────────────────

class RecipeCategory(Base):
    __tablename__ = "recipe_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sort_order = Column(Integer, default=0)

    recipes = relationship("Recipe", back_populates="category")


# ─── Recipes ──────────────────────────────────────────────────────────────────

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("recipe_categories.id"), nullable=True)
    servings = Column(Integer, default=1)
    kcal_override = Column(Float, nullable=True)
    protein_override = Column(Float, nullable=True)
    fat_override = Column(Float, nullable=True)
    carbs_override = Column(Float, nullable=True)
    prep_time_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False)
    image_path = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("RecipeCategory", back_populates="recipes")
    creator = relationship("User", back_populates="recipes")
    ingredients = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan"
    )
    meal_plans = relationship("MealPlan", back_populates="recipe")


# ─── Recipe Ingredients ───────────────────────────────────────────────────────

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    recipe = relationship("Recipe", back_populates="ingredients")
    product = relationship("Product", back_populates="recipe_ingredients")


# ─── Meal Plan ────────────────────────────────────────────────────────────────

class MealPlan(Base):
    __tablename__ = "meal_plan"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_date = Column(Date, nullable=False)
    meal_slot = Column(String(20), nullable=False)  # fruehstueck, mittagessen, abendessen, snack
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "plan_date", "meal_slot", name="uq_meal_plan_slot"),
    )

    user = relationship("User", back_populates="meal_plans")
    recipe = relationship("Recipe", back_populates="meal_plans")


# ─── Shopping List ────────────────────────────────────────────────────────────

class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    custom_name = Column(String(200), nullable=True)  # für manuell hinzugefügte Produkte
    quantity = Column(Float, nullable=True)
    unit = Column(String(20), nullable=True)
    is_checked = Column(Boolean, default=False)
    week_start = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="shopping_items")
    product = relationship("Product", back_populates="shopping_items")


# ─── Meal Plan Templates ─────────────────────────────────────────────────────

class MealPlanTemplate(Base):
    __tablename__ = "meal_plan_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    items = relationship(
        "MealPlanTemplateItem", back_populates="template", cascade="all, delete-orphan"
    )


class MealPlanTemplateItem(Base):
    __tablename__ = "meal_plan_template_items"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("meal_plan_templates.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Montag, 6=Sonntag
    meal_slot = Column(String(20), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)

    template = relationship("MealPlanTemplate", back_populates="items")
    recipe = relationship("Recipe")
