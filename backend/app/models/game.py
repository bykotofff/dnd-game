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

    # ✅ НОВОЕ ПОЛЕ: Связь игроков с персонажами
    player_characters = Column(JSONB, default={}, nullable=False)  # {"user_id": "character_id"}

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
    total_messages = Column(Integer, default=0, nullable=False)
    total_dice_rolls = Column(Integer, default=0, nullable=False)

    # Связи
    campaign = relationship("Campaign", back_populates="games")

    def __repr__(self):
        return f"<Game(name='{self.name}', status='{self.status}', players={self.current_players}/{self.max_players})>"

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

            # ✅ НОВАЯ ЛОГИКА: Связываем игрока с персонажем
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

            # ✅ НОВАЯ ЛОГИКА: Удаляем связь игрока с персонажем
            if self.player_characters and user_id_str in self.player_characters:
                player_chars = dict(self.player_characters)
                character_id = player_chars.pop(user_id_str, None)
                self.player_characters = player_chars

                # Удаляем персонажа из списка персонажей игры
                if character_id:
                    characters_list = list(self.characters) if self.characters else []
                    if character_id in characters_list:
                        characters_list.remove(character_id)
                        self.characters = characters_list

            return True
        return False

    def get_player_character(self, user_id: str) -> str:
        """Получить ID персонажа игрока"""
        if not self.player_characters:
            return None
        return self.player_characters.get(str(user_id))

    def get_character_player(self, character_id: str) -> str:
        """Получить ID игрока по персонажу"""
        if not self.player_characters:
            return None

        character_id_str = str(character_id)
        for user_id, char_id in self.player_characters.items():
            if str(char_id) == character_id_str:
                return user_id
        return None

    def get_players_info(self) -> dict:
        """Получить информацию об игроках с их персонажами"""
        players_info = {}
        if self.players and self.player_characters:
            for user_id in self.players:
                character_id = self.player_characters.get(str(user_id))
                players_info[str(user_id)] = {
                    "character_id": character_id,
                    "is_online": False,  # Будет обновляться в WebSocket
                }
        return players_info

    def next_turn(self) -> dict:
        """Перейти к следующему ходу"""
        if not self.players:
            return {"turn": self.current_turn, "current_player_index": 0, "current_player_id": None}

        self.current_player_index = (self.current_player_index + 1) % len(self.players)

        # Если мы прошли всех игроков, увеличиваем номер хода
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
        return self.get_current_player() == str(user_id)

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
        world_state = dict(self.world_state) if self.world_state else {}
        world_state[key] = value
        self.world_state = world_state

    def get_game_info(self) -> dict:
        """Получить краткую информацию об игре"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "current_players": self.current_players,
            "max_players": self.max_players,
            "current_scene": self.current_scene,
            "created_at": self.created_at.isoformat(),
        }

    def get_detailed_game_info(self) -> dict:
        """Получить детальную информацию об игре"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "campaign_id": str(self.campaign_id),
            "players": self.get_players_info(),  # ✅ ОБНОВЛЕНО: Теперь включает персонажей
            "characters": list(self.characters) if self.characters else [],
            "player_characters": dict(self.player_characters) if self.player_characters else {},  # ✅ НОВОЕ ПОЛЕ
            "current_scene": self.current_scene,
            "turn_info": {
                "current_turn": self.current_turn,
                "current_player_index": self.current_player_index,
                "current_player_id": self.get_current_player(),
            },
            "settings": dict(self.settings) if self.settings else {},
            "world_state": dict(self.world_state) if self.world_state else {},
            "statistics": {
                "session_duration": self.session_duration,
                "total_messages": self.total_messages,
                "total_dice_rolls": self.total_dice_rolls,
            },
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }