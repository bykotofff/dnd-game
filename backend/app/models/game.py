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
        "round_number": 1
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

    def add_player(self, user_id: str, character_id: str = None) -> bool:
        """Добавить игрока в игру с персонажем"""
        if self.current_players >= self.max_players:
            return False

        user_id_str = str(user_id)
        players_list = list(self.players) if self.players else []

        if user_id_str not in players_list:
            players_list.append(user_id_str)
            self.players = players_list
            self.current_players += 1

            # Связываем игрока с персонажем
            if character_id:
                player_chars = dict(self.player_characters) if self.player_characters else {}
                player_chars[user_id_str] = str(character_id)
                self.player_characters = player_chars

                # Добавляем персонажа в список персонажей игры
                characters_list = list(self.characters) if self.characters else []
                character_id_str = str(character_id)
                if character_id_str not in characters_list:
                    characters_list.append(character_id_str)
                    self.characters = characters_list

            return True
        return False

    def remove_player(self, user_id: str) -> bool:
        """Удалить игрока из игры"""
        user_id_str = str(user_id)
        players_list = list(self.players) if self.players else []

        if user_id_str in players_list:
            players_list.remove(user_id_str)
            self.players = players_list
            self.current_players -= 1

            # Убираем связь игрок-персонаж
            if self.player_characters and user_id_str in self.player_characters:
                player_chars = dict(self.player_characters)
                character_id = player_chars.pop(user_id_str, None)
                self.player_characters = player_chars

                # Убираем персонажа из списка персонажей игры
                if character_id and self.characters:
                    characters_list = list(self.characters)
                    if character_id in characters_list:
                        characters_list.remove(character_id)
                        self.characters = characters_list

            return True
        return False

    def can_join(self) -> bool:
        """Можно ли присоединиться к игре"""
        return (self.status in [GameStatus.WAITING, GameStatus.ACTIVE] and
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
            self.status = GameStatus.ENDED
            return True
        return False

    def update_scene(self, scene_description: str):
        """Обновить текущую сцену"""
        self.current_scene = scene_description

    def add_message(self):
        """Увеличить счетчик сообщений"""
        self.total_messages += 1

    def add_dice_roll(self):
        """Увеличить счетчик бросков костей"""
        self.total_dice_rolls += 1

    def update_session_duration(self, minutes: int):
        """Обновить продолжительность сессии"""
        self.session_duration += minutes