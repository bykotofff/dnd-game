from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import uvicorn

from app.config import settings
from app.core.database import init_db, close_db
from app.core.redis_client import redis_client
from app.services.ai_service import ai_service
from app.services.image_service import image_service

# Импорт роутеров
from app.api import auth, users, characters, games, campaigns, websocket
from app.api import images  # Добавляем роутер изображений

# Настройка логирования
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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

        # Проверка сервисов
        ai_health = await ai_service.health_check()
        logger.info(f"AI Service (Ollama) health: {'OK' if ai_health else 'FAILED'}")

        image_health = await image_service.health_check()
        logger.info(f"Image Service (SD) health: {'OK' if image_health else 'FAILED'}")

        logger.info("Server startup completed successfully")

    except Exception as e:
        logger.error(f"Startup failed: {e}")
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

# ✅ ИСПРАВЛЕНИЕ: WebSocket роутер БЕЗ префикса /api
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

        # Проверка сервиса изображений
        image_health = await image_service.health_check()

        return {
            "status": "healthy",
            "services": {
                "redis": "ok" if redis_health else "error",
                "ai": "ok" if ai_health else "error",
                "images": "ok" if image_health else "error"
            },
            "timestamp": "2024-01-01T00:00:00Z"  # В реальном приложении используйте datetime.utcnow()
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service health check failed"
        )


@app.get("/api/info")
async def get_api_info():
    """Информация об API"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "features": [
            "AI Dungeon Master (Ollama)",
            "Character Management",
            "Campaign System",
            "Real-time Gaming (WebSocket)",
            "Image Generation (Stable Diffusion)",
            "Dice Rolling System",
            "Save/Load Game States"
        ],
        "endpoints": {
            "auth": "/api/auth/",
            "users": "/api/users/",
            "characters": "/api/characters/",
            "campaigns": "/api/campaigns/",
            "games": "/api/games/",
            "images": "/api/images/",
            "websocket": "/ws/"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )