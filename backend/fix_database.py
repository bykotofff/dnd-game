#!/usr/bin/env python3
"""
Скрипт диагностики и исправления проблем с базой данных
Запуск: python fix_database.py
"""

import asyncio
import sys
import logging
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.core.database import engine, init_db
from app.models.base import Base
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def check_database_connection():
    """Проверка подключения к базе данных"""
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"✅ PostgreSQL connection OK: {version}")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


async def check_database_exists():
    """Проверка существования базы данных"""
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            logger.info(f"✅ Connected to database: {db_name}")
            return True
    except Exception as e:
        logger.error(f"❌ Database check failed: {e}")
        return False


async def check_tables_exist():
    """Проверка существования таблиц"""
    try:
        async with engine.begin() as conn:
            inspector = inspect(conn.sync_engine)
            tables = inspector.get_table_names()

            logger.info(f"📊 Existing tables: {tables}")

            required_tables = ['users', 'characters', 'campaigns', 'games', 'game_states']
            missing_tables = [table for table in required_tables if table not in tables]

            if missing_tables:
                logger.warning(f"⚠️ Missing tables: {missing_tables}")
                return False
            else:
                logger.info("✅ All required tables exist")
                return True

    except Exception as e:
        logger.error(f"❌ Tables check failed: {e}")
        return False


async def create_tables():
    """Создание таблиц"""
    try:
        logger.info("🔨 Creating database tables...")

        # Импортируем все модели для регистрации
        from app.models import user, character, campaign, game, game_state

        async with engine.begin() as conn:
            # Удаляем все таблицы (ОСТОРОЖНО: удаляет данные!)
            await conn.run_sync(Base.metadata.drop_all)
            logger.info("🗑️ Dropped existing tables")

            # Создаем таблицы заново
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Tables created successfully")

        return True

    except Exception as e:
        logger.error(f"❌ Table creation failed: {e}")
        return False


async def test_user_creation():
    """Тест создания пользователя"""
    try:
        from app.models.user import User
        from app.services.auth_service import auth_service

        async with AsyncSession(engine) as session:
            # Проверяем, что можем создать пользователя
            test_user = User(
                username="test_diagnostic",
                email="test@diagnostic.com",
                hashed_password=auth_service.get_password_hash("test123"),
                display_name="Test User",
                is_active=True
            )

            session.add(test_user)
            await session.commit()
            await session.refresh(test_user)

            logger.info(f"✅ Test user created: {test_user.id}")

            # Удаляем тестового пользователя
            await session.delete(test_user)
            await session.commit()

            logger.info("✅ Test user cleaned up")
            return True

    except Exception as e:
        logger.error(f"❌ User creation test failed: {e}")
        return False


async def check_user_table_structure():
    """Проверка структуры таблицы users"""
    try:
        async with engine.begin() as conn:
            # Проверяем структуру таблицы users
            result = await conn.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))

            columns = result.fetchall()
            if columns:
                logger.info("📋 Users table structure:")
                for col in columns:
                    logger.info(f"  - {col.column_name}: {col.data_type} (nullable: {col.is_nullable})")
                return True
            else:
                logger.error("❌ Users table not found")
                return False

    except Exception as e:
        logger.error(f"❌ Table structure check failed: {e}")
        return False


async def main():
    """Главная функция диагностики"""
    logger.info("🔍 Starting database diagnostics...")
    logger.info(f"📡 Database URL: {settings.DATABASE_URL}")

    # Шаг 1: Проверка подключения
    if not await check_database_connection():
        logger.error("💥 Cannot proceed without database connection")
        return False

    # Шаг 2: Проверка базы данных
    if not await check_database_exists():
        logger.error("💥 Database does not exist or is not accessible")
        return False

    # Шаг 3: Проверка таблиц
    tables_exist = await check_tables_exist()

    if not tables_exist:
        logger.info("🔧 Tables missing, creating them...")
        if not await create_tables():
            logger.error("💥 Failed to create tables")
            return False

    # Шаг 4: Проверка структуры таблицы users
    if not await check_user_table_structure():
        logger.error("💥 Users table structure is invalid")
        return False

    # Шаг 5: Тест создания пользователя
    if not await test_user_creation():
        logger.error("💥 User creation test failed")
        return False

    logger.info("🎉 Database diagnostics completed successfully!")
    logger.info("✨ You can now try to register a user again")
    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        if result:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("🛑 Diagnostics interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)