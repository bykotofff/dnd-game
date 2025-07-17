# backend/app/models/game.py - ИСПРАВЛЕННАЯ ВЕРСИЯ

from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from enum import Enum
from datetime import datetime
from .base import BaseModel


class GameStatus(str, Enum):
    """Статусы игры"""
    WAITING = "waiting"        # Ожидание игроков
    ACTIVE = "active"          # Активная игра
    PAUSED = "paused"          # Приостановлена
    ENDED = "ended"            # Завершена


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

    # ✅ НОВЫЕ СВОЙСТВА для обратной совместимости с существующим кодом
    @property
    def current_turn(self) -> int:
        """Получить текущий ход из turn_info"""
        if self.turn_info:
            return self.turn_info.get("current_turn", 0)
        return 0

    @current_turn.setter
    def current_turn(self, value: int):
        """Установить текущий ход в turn_info"""
        if not self.turn_info:
            self.turn_info = {}
        self.turn_info["current_turn"] = value

    @property
    def current_player_index(self) -> int:
        """Получить индекс текущего игрока из turn_info"""
        if self.turn_info:
            return self.turn_info.get("current_player_index", 0)
        return 0

    @current_player_index.setter
    def current_player_index(self, value: int):
        """Установить индекс текущего игрока в turn_info"""
        if not self.turn_info:
            self.turn_info = {}
        self.turn_info["current_player_index"] = value

    @property
    def round_number(self) -> int:
        """Получить номер раунда из turn_info"""
        if self.turn_info:
            return self.turn_info.get("round_number", 1)
        return 1

    @round_number.setter
    def round_number(self, value: int):
        """Установить номер раунда в turn_info"""
        if not self.turn_info:
            self.turn_info = {}
        self.turn_info["round_number"] = value

    @property
    def initiative_order(self) -> list:
        """Получить порядок инициативы из turn_info"""
        if self.turn_info:
            return self.turn_info.get("initiative_order", [])
        return []

    @initiative_order.setter
    def initiative_order(self, value: list):
        """Установить порядок инициативы в turn_info"""
        if not self.turn_info:
            self.turn_info = {}
        self.turn_info["initiative_order"] = value

    def get_current_player(self) -> str:
        """Получить ID текущего игрока"""
        if self.turn_info:
            current_player_id = self.turn_info.get("current_player_id")
            if current_player_id:
                return current_player_id

            # Если нет явного ID, пытаемся получить из порядка инициативы
            initiative_order = self.turn_info.get("initiative_order", [])
            current_index = self.turn_info.get("current_player_index", 0)

            if initiative_order and 0 <= current_index < len(initiative_order):
                return initiative_order[current_index].get("player_id", "")

        return ""

    def set_current_player(self, player_id: str):
        """Установить текущего игрока"""
        if not self.turn_info:
            self.turn_info = {}
        self.turn_info["current_player_id"] = player_id

    def next_turn(self):
        """Перейти к следующему ходу"""
        if not self.turn_info:
            self.turn_info = {
                "current_turn": 0,
                "initiative_order": [],
                "round_number": 1,
                "current_player_index": 0
            }

        # Увеличиваем номер хода
        self.turn_info["current_turn"] = self.turn_info.get("current_turn", 0) + 1

        # Переход к следующему игроку в порядке инициативы
        initiative_order = self.turn_info.get("initiative_order", [])
        if initiative_order:
            current_index = self.turn_info.get("current_player_index", 0)
            next_index = (current_index + 1) % len(initiative_order)

            # Если мы прошли полный круг, увеличиваем номер раунда
            if next_index == 0:
                self.turn_info["round_number"] = self.turn_info.get("round_number", 1) + 1

            self.turn_info["current_player_index"] = next_index

            # Устанавливаем ID текущего игрока
            if next_index < len(initiative_order):
                self.turn_info["current_player_id"] = initiative_order[next_index].get("player_id")

    def add_player(self, user_id: str, character_id: str = None) -> bool:
        """Добавить игрока в игру"""
        user_id = str(user_id)

        # Проверяем лимит игроков
        if self.current_players >= self.max_players:
            return False

        # Проверяем, что игрок еще не в игре
        if user_id in (self.players or []):
            return False

        # Добавляем игрока
        if not self.players:
            self.players = []
        self.players.append(user_id)

        # Добавляем персонажа если указан
        if character_id:
            character_id = str(character_id)
            if not self.characters:
                self.characters = []
            if character_id not in self.characters:
                self.characters.append(character_id)

            # Связываем игрока с персонажем
            if not self.player_characters:
                self.player_characters = {}
            self.player_characters[user_id] = character_id

        # Обновляем счетчик игроков
        self.current_players = len(self.players)

        return True

    def remove_player(self, user_id: str) -> bool:
        """Удалить игрока из игры"""
        user_id = str(user_id)

        if not self.players or user_id not in self.players:
            return False

        # Удаляем игрока из списка
        self.players.remove(user_id)

        # Удаляем связь с персонажем
        if self.player_characters and user_id in self.player_characters:
            character_id = self.player_characters[user_id]
            del self.player_characters[user_id]

            # Удаляем персонажа из списка если больше никто его не использует
            if self.characters and character_id in self.characters:
                if character_id not in self.player_characters.values():
                    self.characters.remove(character_id)

        # Обновляем счетчик игроков
        self.current_players = len(self.players)

        # Удаляем из порядка инициативы если есть
        if self.turn_info and "initiative_order" in self.turn_info:
            self.turn_info["initiative_order"] = [
                entry for entry in self.turn_info["initiative_order"]
                if entry.get("player_id") != user_id
            ]

        return True

    def get_player_character_id(self, user_id: str) -> str:
        """Получить ID персонажа игрока"""
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

    # ✅ ИСПРАВЛЕННЫЙ МЕТОД: Базовая информация об игре
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
            "created_at": self.created_at.isoformat() if self.created_at else ""
        }

    # ✅ ИСПРАВЛЕННЫЙ МЕТОД: Детальная информация об игре
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
            "statistics": {
                "session_duration": self.session_duration or 0,
                "total_messages": self.total_messages or 0,
                "total_dice_rolls": self.total_dice_rolls or 0
            },
            "updated_at": self.updated_at.isoformat() if self.updated_at else ""
        }

        return detailed_info