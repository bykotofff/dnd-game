# backend/app/core/database.py (ИСПРАВЛЕННАЯ ВЕРСИЯ)

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import MetaData
from typing import AsyncGenerator
import asyncio
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Импортируем Base из models/base.py вместо создания нового
from app.models.base import Base

# Метаданные для миграций
metadata = MetaData()

# Создаем асинхронный движок базы данных
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Логирование SQL запросов в debug режиме
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,  # Проверка соединений перед использованием
    pool_recycle=3600,   # Переиспользование соединений каждый час
)

# Создаем фабрику сессий
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency для получения сессии базы данных
    Используется в FastAPI endpoints
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """
    Инициализация базы данных
    Создает все таблицы
    """
    try:
        async with engine.begin() as conn:
            # Импортируем все модели, чтобы они были зарегистрированы
            from app.models import user, character, game, campaign, game_state

            logger.info("Creating database tables...")

            # Создаем все таблицы
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")

    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


async def close_db():
    """
    Закрытие соединений с базой данных
    """
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")


class DatabaseManager:
    """
    Менеджер для управления соединениями с базой данных
    """

    def __init__(self):
        self.engine = engine
        self.session_maker = async_session_maker

    async def get_session(self) -> AsyncSession:
        """Получить новую сессию"""
        return self.session_maker()

    async def health_check(self) -> bool:
        """Проверка здоровья базы данных"""
        try:
            async with self.session_maker() as session:
                result = await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    async def execute_raw(self, query: str, params: dict = None):
        """Выполнение сырого SQL запроса"""
        async with self.session_maker() as session:
            result = await session.execute(query, params or {})
            await session.commit()
            return result


# Глобальный экземпляр менеджера базы данных
db_manager = DatabaseManager()