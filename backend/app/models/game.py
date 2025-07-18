# backend/app/models/game.py - ИСПРАВЛЕННАЯ ВЕРСИЯ

from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from enum import Enum
from datetime import datetime
from .base import BaseModel


class GameStatus(str, Enum):
    """Статусы игры"""
    WAITING = "WAITING"        # Ожидание игроков
    ACTIVE = "ACTIVE"          # Активная игра
    PAUSED = "PAUSED"          # Приостановлена
    ENDED = "ENDED"            # Завершена


class Game(BaseModel):
    """
    Модель игры D&D
    """
    __tablename__ = "games"

    # Основная информация
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(GameStatus), default=GameStatus.WAITING, nullable=False, index=True)

    # Игроки и персонажи
    max_players = Column(Integer, default=6, nullable=False)
    current_players = Column(Integer, default=0, nullable=False)
    players = Column(JSONB, default=[], nullable=False)  # Список ID игроков
    characters = Column(JSONB, default=[], nullable=False)  # Список ID персонажей
    player_characters = Column(JSONB, default={}, nullable=False)  # Связь игрок-персонаж

    # Игровое состояние
    current_scene = Column(Text, nullable=True)
    turn_info = Column(JSONB, default={
        "current_turn": 0,
        "initiative_order": [],
        "round_number": 1,
        "current_player_index": 0,
        "current_player_id": None
    }, nullable=False)

    # Настройки игры
    settings = Column(JSONB, default={
        "auto_initiative": True,
        "show_hp": True,
        "allow_private_rolls": True,
        "combat_tracking": True
    }, nullable=False)

    # Игровой мир
    world_state = Column(JSONB, default={}, nullable=False)  # Состояние игрового мира

    # Статистика
    session_duration = Column(Integer, default=0, nullable=False)  # В минутах
    total_messages = Column(Integer, default=0, nullable=False)
    total_dice_rolls = Column(Integer, default=0, nullable=False)

    # Связи
    campaign = relationship("Campaign", back_populates="games")

    def __repr__(self):
        return f"<Game(name='{self.name}', status='{self.status}', players={self.current_players}/{self.max_players})>"

    def get_current_player(self) -> str:
        """Получить ID текущего игрока"""
        if self.turn_info and self.players:
            current_index = self.turn_info.get("current_player_index", 0)
            if 0 <= current_index < len(self.players):
                return self.players[current_index]
        return ""

    def get_character_for_player(self, user_id: str) -> str:
        """Получить ID персонажа для игрока"""
        if self.player_characters:
            return self.player_characters.get(str(user_id), "")
        return ""

    def is_player_in_game(self, user_id: str) -> bool:
        """Проверить, находится ли игрок в игре"""
        return str(user_id) in (self.players or [])

    def can_join(self) -> bool:
        """Проверить, можно ли присоединиться к игре"""
        # Игра должна быть в статусе ожидания или активной
        if self.status not in [GameStatus.WAITING, GameStatus.ACTIVE]:
            return False

        # Должно быть свободное место
        if self.current_players >= self.max_players:
            return False

        return True

    def get_game_info(self) -> dict:
        """Получить базовую информацию об игре для списков"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "status": self.status.value if isinstance(self.status, GameStatus) else str(self.status),
            "current_players": self.current_players or 0,
            "max_players": self.max_players or 6,
            "current_scene": self.current_scene,
            "created_at": self.created_at.isoformat() if self.created_at else "",
            "updated_at": self.updated_at.isoformat() if self.updated_at else ""
        }

    def get_detailed_game_info(self) -> dict:
        """Получить детальную информацию об игре"""
        base_info = self.get_game_info()

        # Добавляем детальную информацию
        detailed_info = {
            **base_info,
            "campaign_id": str(self.campaign_id),
            "players": self.players or [],
            "characters": self.characters or [],
            "player_characters": self.player_characters or {},
            "turn_info": self.turn_info or {},
            "settings": self.settings or {},
            "world_state": self.world_state or {},
            "session_duration": self.session_duration or 0,
            "total_messages": self.total_messages or 0,
            "total_dice_rolls": self.total_dice_rolls or 0
        }

        return detailed_info