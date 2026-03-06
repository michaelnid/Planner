from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, SessionLocal
from app.models import ProductCategory, RecipeCategory, User
from app.auth.service import hash_password
from app.auth.router import router as auth_router
from app.routers.products import router as products_router
from app.routers.recipes import router as recipes_router
from app.routers.meal_plan import router as meal_plan_router
from app.routers.shopping import router as shopping_router
from app.routers.users import router as users_router

app = FastAPI(
    title="MIKE - Planner",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploads)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(recipes_router)
app.include_router(meal_plan_router)
app.include_router(shopping_router)
app.include_router(users_router)


SEED_PRODUCT_CATEGORIES = [
    {"name": "Obst", "sort_order": 1},
    {"name": "Gemüse", "sort_order": 2},
    {"name": "Fleisch", "sort_order": 3},
    {"name": "Fisch", "sort_order": 4},
    {"name": "Milchprodukte", "sort_order": 5},
    {"name": "Backwaren", "sort_order": 6},
    {"name": "Gewürze", "sort_order": 7},
    {"name": "Getränke", "sort_order": 8},
    {"name": "Tiefkühl", "sort_order": 9},
    {"name": "Konserven", "sort_order": 10},
    {"name": "Sonstiges", "sort_order": 99},
]

SEED_RECIPE_CATEGORIES = [
    {"name": "Frühstück", "sort_order": 1},
    {"name": "Mittagessen", "sort_order": 2},
    {"name": "Abendessen", "sort_order": 3},
    {"name": "Snack", "sort_order": 4},
    {"name": "Dessert", "sort_order": 5},
    {"name": "Vegetarisch", "sort_order": 6},
    {"name": "Vegan", "sort_order": 7},
]


@app.on_event("startup")
def on_startup():
    init_db()
    _seed_data()


def _seed_data():
    db = SessionLocal()
    try:
        # Seed product categories
        if db.query(ProductCategory).count() == 0:
            for cat_data in SEED_PRODUCT_CATEGORIES:
                db.add(ProductCategory(**cat_data))
            db.commit()

        # Seed recipe categories
        if db.query(RecipeCategory).count() == 0:
            for cat_data in SEED_RECIPE_CATEGORIES:
                db.add(RecipeCategory(**cat_data))
            db.commit()

        # Create default admin user
        if db.query(User).count() == 0:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123!"),
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
