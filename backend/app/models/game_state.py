from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from .base import BaseModel


class GameState(BaseModel):
    """
    Модель для сохранения состояния игры
    Используется для автосохранения и загрузки
    """
    __tablename__ = "game_states"

    # Связь с игрой
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False, index=True)

    # Метаданные сохранения
    save_name = Column(String(200), nullable=True)  # Название сохранения
    is_autosave = Column(Boolean, default=True, nullable=False)
    save_number = Column(Integer, nullable=False, index=True)  # Номер сохранения

    # Состояние игры
    game_data = Column(JSONB, nullable=False)  # Полное состояние игры
    character_states = Column(JSONB, default={}, nullable=False)  # Состояния персонажей
    world_state = Column(JSONB, default={}, nullable=False)  # Состояние мира

    # Контекст для ИИ
    ai_context = Column(Text, nullable=True)  # Сохраненный контекст
    recent_messages = Column(JSONB, default=[], nullable=False)  # Последние сообщения

    # Игровая ситуация
    current_scene = Column(String(200), nullable=True)
    active_combat = Column(Boolean, default=False, nullable=False)
    initiative_order = Column(JSONB, default=[], nullable=False)

    # Связи
    game = relationship("Game")

    def __repr__(self):
        return f"<GameState(game_id='{self.game_id}', save_number={self.save_number}, is_autosave={self.is_autosave})>"

    def get_save_info(self) -> dict:
        """Получить информацию о сохранении"""
        return {
            "id": str(self.id),
            "game_id": str(self.game_id),
            "save_name": self.save_name or f"Автосохранение #{self.save_number}",
            "save_number": self.save_number,
            "is_autosave": self.is_autosave,
            "current_scene": self.current_scene,
            "active_combat": self.active_combat,
            "character_count": len(self.character_states),
            "message_count": len(self.recent_messages),
            "created_at": self.created_at.isoformat(),
        }

    def restore_game_state(self) -> dict:
        """Восстановить состояние игры"""
        return {
            "game_data": self.game_data,
            "character_states": self.character_states,
            "world_state": self.world_state,
            "ai_context": self.ai_context,
            "recent_messages": self.recent_messages,
            "current_scene": self.current_scene,
            "active_combat": self.active_combat,
            "initiative_order": self.initiative_order,
        }


class GameMessage(BaseModel):
    """
    Модель для хранения сообщений игры
    """
    __tablename__ = "game_messages"

    # Связь с игрой
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False, index=True)

    # Отправитель
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    sender_type = Column(String(20), nullable=False)  # "player", "dm", "system", "ai"
    sender_name = Column(String(100), nullable=True)

    # Содержимое сообщения
    message_type = Column(String(20), nullable=False)  # "text", "action", "dice_roll", "system"
    content = Column(Text, nullable=False)

    # Метаданные
    character_id = Column(UUID(as_uuid=True), nullable=True)  # Если от персонажа
    is_ooc = Column(Boolean, default=False, nullable=False)  # Out of character
    is_whisper = Column(Boolean, default=False, nullable=False)  # Приватное сообщение
    whisper_target = Column(UUID(as_uuid=True), nullable=True)  # Кому адресован шепот

    # Данные броска костей (если применимо)
    dice_data = Column(JSONB, nullable=True)

    # Timestamp для сортировки
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Связи
    game = relationship("Game")

    def __repr__(self):
        return f"<GameMessage(game_id='{self.game_id}', sender_type='{self.sender_type}', type='{self.message_type}')>"

    def to_dict(self) -> dict:
        """Преобразовать сообщение в словарь"""
        return {
            "id": str(self.id),
            "game_id": str(self.game_id),
            "sender": {
                "id": str(self.sender_id) if self.sender_id else None,
                "type": self.sender_type,
                "name": self.sender_name,
            },
            "message_type": self.message_type,
            "content": self.content,
            "character_id": str(self.character_id) if self.character_id else None,
            "is_ooc": self.is_ooc,
            "is_whisper": self.is_whisper,
            "whisper_target": str(self.whisper_target) if self.whisper_target else None,
            "dice_data": self.dice_data,
            "timestamp": self.timestamp.isoformat(),
        }


class DiceRoll(BaseModel):
    """
    Модель для хранения бросков костей
    """
    __tablename__ = "dice_rolls"

    # Связи
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False, index=True)
    player_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    character_id = Column(UUID(as_uuid=True), nullable=True)

    # Детали броска
    dice_notation = Column(String(50), nullable=False)  # Например: "1d20+5"
    purpose = Column(String(100), nullable=True)  # Цель броска (attack, skill check, etc.)

    # Результаты
    individual_rolls = Column(JSONB, nullable=False)  # Отдельные броски
    modifiers = Column(JSONB, default={}, nullable=False)  # Модификаторы
    total_result = Column(Integer, nullable=False)

    # Контекст
    skill_or_ability = Column(String(50), nullable=True)  # Навык или характеристика
    difficulty_class = Column(Integer, nullable=True)  # DC для проверки
    is_advantage = Column(Boolean, default=False, nullable=False)
    is_disadvantage = Column(Boolean, default=False, nullable=False)
    is_critical = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<DiceRoll(notation='{self.dice_notation}', result={self.total_result})>"

    def to_dict(self) -> dict:
        """Преобразовать бросок в словарь"""
        return {
            "id": str(self.id),
            "game_id": str(self.game_id),
            "player_id": str(self.player_id),
            "character_id": str(self.character_id) if self.character_id else None,
            "dice_notation": self.dice_notation,
            "purpose": self.purpose,
            "individual_rolls": self.individual_rolls,
            "modifiers": self.modifiers,
            "total_result": self.total_result,
            "skill_or_ability": self.skill_or_ability,
            "difficulty_class": self.difficulty_class,
            "is_advantage": self.is_advantage,
            "is_disadvantage": self.is_disadvantage,
            "is_critical": self.is_critical,
            "created_at": self.created_at.isoformat(),
        }