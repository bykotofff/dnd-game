#!/usr/bin/env python3
"""
Скрипт запуска D&D AI Game Server
"""

import asyncio
import uvicorn
import sys
import os
import logging
from pathlib import Path

# Добавляем корневую папку в PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.core.database import init_db
from app.core.redis_client import redis_client

# Настройка логирования
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("dnd_server.log") if not settings.DEBUG else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)


async def check_dependencies():
    """Проверка зависимостей перед запуском"""
    logger.info("Checking dependencies...")

    try:
        # Проверяем подключение к Redis
        await redis_client.connect()
        redis_health = await redis_client.health_check()

        if not redis_health:
            logger.error("Redis connection failed")
            return False

        logger.info("Redis connection: OK")
        await redis_client.disconnect()

        # Проверяем базу данных (инициализируем таблицы)
        await init_db()
        logger.info("Database connection: OK")

        return True

    except Exception as e:
        logger.error(f"Dependency check failed: {e}")
        return False


def create_directories():
    """Создание необходимых директорий"""
    directories = [
        settings.UPLOAD_DIR,
        os.path.join(settings.UPLOAD_DIR, "characters"),
        os.path.join(settings.UPLOAD_DIR, "generated"),
        os.path.join(settings.UPLOAD_DIR, "campaigns"),
        "logs"
    ]

    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Directory created/verified: {directory}")


async def main():
    """Главная функция запуска"""
    logger.info("=" * 50)
    logger.info("D&D AI Game Server Starting...")
    logger.info("=" * 50)

    # Создаем необходимые директории
    create_directories()

    # Проверяем зависимости
    if not await check_dependencies():
        logger.error("Dependency check failed. Exiting...")
        sys.exit(1)

    logger.info("All dependencies OK. Starting server...")

    # Запускаем сервер
    config = uvicorn.Config(
        app="app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=settings.DEBUG,
        reload_dirs=["app"] if settings.DEBUG else None,
        access_log=True,
        use_colors=True,
    )

    server = uvicorn.Server(config)

    try:
        await server.serve()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application terminated by user")
    except Exception as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)