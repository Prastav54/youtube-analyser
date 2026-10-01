"""Runtime settings loaded from the environment and backend/.env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings.

    YOUTUBE_API_KEY is read from the environment or from backend/.env.
    """

    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    youtube_api_key: str = ""


settings = Settings()
