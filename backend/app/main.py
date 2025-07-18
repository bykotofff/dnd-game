# backend/app/main.py - ИСПРАВЛЕННАЯ ВЕРСИЯ

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.database import init_db, close_db
from app.core.redis_client import redis_client
from app.services.ai_service import ai_service
from app.services.image_service import image_service

# Импорт роутеров
from app.api import (
    auth,
    users,
    characters,
    campaigns,
    games,
    images,
    websocket
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logger.info("Starting D&D AI Game Server...")

    try:
        # Инициализация базы данных
        await init_db()
        logger.info("Database initialized")

        # Подключение к Redis
        await redis_client.connect()
        logger.info("Redis connected")

        # Проверка AI сервиса
        ai_health = await ai_service.health_check()
        logger.info(f"AI Service (Ollama) health: {'OK' if ai_health else 'FAILED'}")

        # Проверка Image сервиса
        image_health = await image_service.health_check()
        logger.info(f"Image Service (SD) health: {'OK' if image_health else 'FAILED'}")

        logger.info("Server startup completed successfully")

    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down server...")

    try:
        await redis_client.disconnect()
        await close_db()
        await ai_service.close()
        await image_service.close()
        logger.info("Server shutdown completed")

    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# Создание приложения FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-powered Dungeons & Dragons game server",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Статические файлы
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# ✅ ИСПРАВЛЕНИЕ: WebSocket роутер с правильным префиксом /ws
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Роутеры API
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(characters.router, prefix="/api/characters", tags=["Characters"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(games.router, prefix="/api/games", tags=["Games"])
app.include_router(images.router, prefix="/api/images", tags=["Images"])


@app.get("/")
async def root():
    """Корневой endpoint"""
    return {
        "message": "D&D AI Game Server",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервера и сервисов"""
    try:
        # Проверка Redis
        redis_health = await redis_client.health_check()

        # Проверка AI сервиса
        ai_health = await ai_service.health_check()

        # Проверка Image сервиса
        image_health = await image_service.health_check()

        return {
            "status": "healthy",
            "version": settings.VERSION,
            "services": {
                "redis": "ok" if redis_health else "error",
                "ai": "ok" if ai_health else "error",
                "image": "ok" if image_health else "error"
            },
            "environment": settings.ENVIRONMENT
        }

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }