from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_env: str = "dev"

    # Database
    database_url: str = "sqlite:///app.db"

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Google Gemini
    google_api_key: str = "" # Add your new API key here
    gemini_model: str = "models/gemini-1.5-flash"  # Higher quota limits
    gemini_temperature: float = 0.2



    # Trusted medical domains
    trusted_medical_domains: List[str] = [
        "nih.gov",
        "ncbi.nlm.nih.gov",
        "medlineplus.gov",
        "who.int",
        "cdc.gov",
        "mayoclinic.org",
        "clevelandclinic.org",
        "uptodate.com",
        "bmj.com",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_settings() -> Settings:
    return Settings()
