from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # Application
    APP_HOST: str = Field(default="0.0.0.0")
    APP_PORT: int = Field(default=8000)
    ENVIRONMENT: str = Field(default="development")

    # OpenAI
    OPENAI_API_KEY: str = Field(default="")

    # Sarvam AI (Hindi/Marathi STT + TTS)
    SARVAM_API_KEY: str = Field(default="")

    # Whisper — 'base' is fast; use 'small' or 'medium' for better multilingual accuracy
    WHISPER_MODEL: str = Field(default="base")

    # File storage
    UPLOAD_DIR: str = Field(default="app/data/uploads")
    TEMP_DIR: str = Field(default="app/data/temp")

    # CORS — comma-separated list of allowed origins (use '*' only in dev)
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://localhost:3000")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
