from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
import os


class Settings(BaseSettings):
    # Общие настройки приложения
    APP_NAME: str = "D&D AI Game"
    VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")

    # Сервер
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")

    # База данных PostgreSQL
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=5432, env="DB_PORT")
    DB_NAME: str = Field(default="dnd_game", env="DB_NAME")
    DB_USER: str = Field(default="dnd_user", env="DB_USER")
    DB_PASSWORD: str = Field(default="dnd_password", env="DB_PASSWORD")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # Redis
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Ollama (AI)
    OLLAMA_HOST: str = Field(default="localhost", env="OLLAMA_HOST")
    OLLAMA_PORT: int = Field(default=11434, env="OLLAMA_PORT")
    OLLAMA_MODEL: str = Field(default="llama3.1:8b", env="OLLAMA_MODEL")

    @property
    def OLLAMA_URL(self) -> str:
        return f"http://{self.OLLAMA_HOST}:{self.OLLAMA_PORT}"

    # Stable Diffusion
    SD_HOST: str = Field(default="localhost", env="SD_HOST")
    SD_PORT: int = Field(default=7860, env="SD_PORT")

    @property
    def SD_URL(self) -> str:
        return f"http://{self.SD_HOST}:{self.SD_PORT}"

    # JWT токены
    SECRET_KEY: str = Field(default="your-secret-key-change-this", env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Игровые настройки
    MAX_PLAYERS_PER_GAME: int = 6
    GAME_SESSION_TTL: int = 3600  # 1 час в секундах
    AI_RESPONSE_TIMEOUT: int = 30  # 30 секунд
    MAX_CONTEXT_LENGTH: int = 4000  # Максимальная длина контекста для ИИ

    # Кэширование
    CACHE_TTL: int = 300  # 5 минут
    CONTEXT_CACHE_TTL: int = 1800  # 30 минут

    # Файлы и загрузки
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp"]

    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Логирование
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = "json"

    # Шифрование данных
    ENCRYPTION_KEY: str = Field(default="your-encryption-key-32-chars", env="ENCRYPTION_KEY")

    class Config:
        env_file = ".env"
        case_sensitive = True


# Создаем экземпляр настроек
settings = Settings()

# Проверяем критические настройки
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Валидация ключей
if len(settings.SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY должен быть длиной минимум 32 символа")

if len(settings.ENCRYPTION_KEY) != 32:
    raise ValueError("ENCRYPTION_KEY должен быть длиной ровно 32 символа")