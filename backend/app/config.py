import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-to-a-random-string-min-32-chars"
    DATABASE_URL: str = "sqlite:///./planner.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "./uploads"
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
