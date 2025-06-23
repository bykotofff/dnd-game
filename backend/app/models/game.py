from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from enum import Enum
from .base import BaseModel


class GameStatus(str, Enum):
    """Статусы игровой сессии"""
    WAITING = "waiting"        # Ожидание игроков
    ACTIVE = "active"          # Активная игра
    PAUSED = "paused"          # Приостановлена
    COMPLETED = "completed"    # Завершена
    CANCELLED = "cancelled"    # Отменена


class Game(BaseModel):
    """
    Модель игровой сессии
    """
    __tablename__ = "games"

    # Связь с кампанией
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)

    # Основная информация
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(GameStatus), default=GameStatus.WAITING, nullable=False, index=True)

    # Участники
    max_players = Column(Integer, default=6, nullable=False)
    current_players = Column(Integer, default=0, nullable=False)
    players = Column(JSONB, default=[], nullable=False)  # Список ID игроков
    characters = Column(JSONB, default=[], nullable=False)  # Список ID персонажей

    # Игровое состояние
    current_scene = Column(String(200), nullable=True)  # Текущая сцена/локация
    current_turn = Column(Integer, default=0, nullable=False)  # Номер хода
    current_player_index = Column(Integer, default=0, nullable=False)  # Индекс текущего игрока

    # Настройки игры
    settings = Column(JSONB, default={
        "dice_rolling": "manual",  # manual, auto, dm_only
        "character_sheets_visible": True,
        "allow_pvp": False,
        "death_saves": True,
        "milestone_leveling": False,
    }, nullable=False)

    # Контекст для ИИ
    ai_context = Column(Text, nullable=True)  # Контекст для Данжеон Мастера
    world_state = Column(JSONB, default={}, nullable=False)  # Состояние игрового мира

    # Статистика
    session_duration = Column(Integer, default=0, nullable=False)  # В минутах
    messages_count = Column(Integer, default=0, nullable=False)
    dice_rolls_count = Column(Integer, default=0, nullable=False)

    # Связи
    campaign = relationship("Campaign", back_populates="games")

    def __repr__(self):
        return f"<Game(name='{self.name}', status='{self.status}', players={self.current_players}/{self.max_players})>"

    def add_player(self, user_id: str, character_id: str = None) -> bool:
        """Добавить игрока в игру"""
        if self.current_players >= self.max_players:
            return False

        if user_id not in self.players:
            self.players = self.players + [user_id]
            self.current_players += 1

            if character_id and character_id not in self.characters:
                self.characters = self.characters + [character_id]

            return True
        return False

    def remove_player(self, user_id: str) -> bool:
        """Удалить игрока из игры"""
        if user_id in self.players:
            players_list = list(self.players)
            players_list.remove(user_id)
            self.players = players_list
            self.current_players -= 1
            return True
        return False

    def add_character(self, character_id: str) -> bool:
        """Добавить персонажа в игру"""
        if character_id not in self.characters:
            self.characters = self.characters + [character_id]
            return True
        return False

    def remove_character(self, character_id: str) -> bool:
        """Удалить персонажа из игры"""
        if character_id in self.characters:
            characters_list = list(self.characters)
            characters_list.remove(character_id)
            self.characters = characters_list
            return True
        return False

    def next_turn(self) -> dict:
        """Переход к следующему ходу"""
        if self.current_players == 0:
            return {"error": "No players in game"}

        self.current_player_index = (self.current_player_index + 1) % self.current_players
        if self.current_player_index == 0:
            self.current_turn += 1

        current_player_id = self.players[self.current_player_index] if self.players else None

        return {
            "turn": self.current_turn,
            "current_player_index": self.current_player_index,
            "current_player_id": current_player_id,
        }

    def get_current_player(self) -> str:
        """Получить ID текущего игрока"""
        if not self.players or self.current_player_index >= len(self.players):
            return None
        return self.players[self.current_player_index]

    def is_player_turn(self, user_id: str) -> bool:
        """Проверить, ход ли данного игрока"""
        return self.get_current_player() == user_id

    def can_join(self) -> bool:
        """Можно ли присоединиться к игре"""
        return (self.status == GameStatus.WAITING and
                self.current_players < self.max_players)

    def start_game(self) -> bool:
        """Начать игру"""
        if self.status == GameStatus.WAITING and self.current_players > 0:
            self.status = GameStatus.ACTIVE
            return True
        return False

    def pause_game(self) -> bool:
        """Приостановить игру"""
        if self.status == GameStatus.ACTIVE:
            self.status = GameStatus.PAUSED
            return True
        return False

    def resume_game(self) -> bool:
        """Возобновить игру"""
        if self.status == GameStatus.PAUSED:
            self.status = GameStatus.ACTIVE
            return True
        return False

    def end_game(self) -> bool:
        """Завершить игру"""
        if self.status in [GameStatus.ACTIVE, GameStatus.PAUSED]:
            self.status = GameStatus.COMPLETED
            return True
        return False

    def cancel_game(self) -> bool:
        """Отменить игру"""
        if self.status in [GameStatus.WAITING, GameStatus.ACTIVE, GameStatus.PAUSED]:
            self.status = GameStatus.CANCELLED
            return True
        return False

    def update_world_state(self, key: str, value: any) -> None:
        """Обновить состояние мира"""
        world_state = dict(self.world_state)
        world_state[key] = value
        self.world_state = world_state

    def get_world_state(self, key: str, default=None):
        """Получить значение из состояния мира"""
        return self.world_state.get(key, default)

    def get_game_info(self) -> dict:
        """Получить информацию об игре"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "players": {
                "current": self.current_players,
                "max": self.max_players,
                "list": self.players,
            },
            "characters": self.characters,
            "current_scene": self.current_scene,
            "turn_info": {
                "turn": self.current_turn,
                "current_player_index": self.current_player_index,
                "current_player_id": self.get_current_player(),
            },
            "settings": self.settings,
            "statistics": {
                "session_duration": self.session_duration,
                "messages_count": self.messages_count,
                "dice_rolls_count": self.dice_rolls_count,
            },
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }