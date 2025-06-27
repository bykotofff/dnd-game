# backend/app/models/__init__.py (ИСПРАВЛЕННАЯ ВЕРСИЯ)

"""
Модели базы данных для D&D AI Game
"""

# Импортируем базовый класс
from .base import Base, BaseModel

# Импортируем все модели для регистрации в SQLAlchemy
from .user import User
from .character import Character
from .campaign import Campaign
from .game import Game
from .game_state import GameState

# Экспортируем все модели для использования в других модулях
__all__ = [
    'Base',
    'BaseModel',
    'User',
    'Character',
    'Campaign',
    'Game',
    'GameState',
]

# Этот файл гарантирует, что все модели будут зарегистрированы в SQLAlchemy
# при импорте любой модели из пакета models