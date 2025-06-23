from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from enum import Enum
from .base import BaseModel


class CampaignStatus(str, Enum):
    """Статусы кампании"""
    PLANNING = "planning"      # Планирование
    ACTIVE = "active"          # Активная
    ON_HOLD = "on_hold"        # Приостановлена
    COMPLETED = "completed"    # Завершена
    ARCHIVED = "archived"      # Архивирована


class Campaign(BaseModel):
    """
    Модель кампании D&D
    """
    __tablename__ = "campaigns"

    # Создатель кампании (DM)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Основная информация
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    setting = Column(String(100), nullable=True)  # Сеттинг (Forgotten Realms, Homebrew, etc.)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.PLANNING, nullable=False, index=True)

    # Участники
    max_players = Column(Integer, default=6, nullable=False)
    current_players = Column(Integer, default=0, nullable=False)
    players = Column(JSONB, default=[], nullable=False)  # Список ID игроков

    # Игровой мир
    world_description = Column(Text, nullable=True)
    locations = Column(JSONB, default=[], nullable=False)  # Локации
    npcs = Column(JSONB, default=[], nullable=False)  # НПС
    quests = Column(JSONB, default=[], nullable=False)  # Квесты

    # Глобальный сюжет
    main_story = Column(Text, nullable=True)
    story_progress = Column(JSONB, default={}, nullable=False)
    important_events = Column(JSONB, default=[], nullable=False)

    # Правила и настройки
    house_rules = Column(Text, nullable=True)
    starting_level = Column(Integer, default=1, nullable=False)

    # Настройки кампании
    settings = Column(JSONB, default={
        "allow_homebrew": False,
        "milestone_leveling": True,
        "starting_gold": "standard",
        "ability_score_generation": "point_buy",
        "death_saves": True,
        "pvp_allowed": False,
        "resurrection_rules": "standard",
    }, nullable=False)

    # ИИ настройки
    ai_personality = Column(Text, nullable=True)  # Личность ИИ-мастера
    ai_style = Column(String(50), default="balanced", nullable=False)  # serious, humorous, dramatic, balanced

    # Статистика
    total_sessions = Column(Integer, default=0, nullable=False)
    total_playtime = Column(Integer, default=0, nullable=False)  # В минутах

    # Видимость
    is_public = Column(Boolean, default=False, nullable=False)
    requires_approval = Column(Boolean, default=True, nullable=False)

    # Связи
    creator = relationship("User", back_populates="created_campaigns")
    games = relationship("Game", back_populates="campaign", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Campaign(name='{self.name}', status='{self.status}', players={self.current_players}/{self.max_players})>"

    def add_player(self, user_id: str) -> bool:
        """Добавить игрока в кампанию"""
        if self.current_players >= self.max_players:
            return False

        if user_id not in self.players:
            self.players = self.players + [user_id]
            self.current_players += 1
            return True
        return False

    def remove_player(self, user_id: str) -> bool:
        """Удалить игрока из кампании"""
        if user_id in self.players:
            players_list = list(self.players)
            players_list.remove(user_id)
            self.players = players_list
            self.current_players -= 1
            return True
        return False

    def can_join(self, user_id: str) -> bool:
        """Можно ли присоединиться к кампании"""
        return (self.status in [CampaignStatus.PLANNING, CampaignStatus.ACTIVE] and
                self.current_players < self.max_players and
                user_id not in self.players)

    def start_campaign(self) -> bool:
        """Начать кампанию"""
        if self.status == CampaignStatus.PLANNING and self.current_players > 0:
            self.status = CampaignStatus.ACTIVE
            return True
        return False

    def pause_campaign(self) -> bool:
        """Приостановить кампанию"""
        if self.status == CampaignStatus.ACTIVE:
            self.status = CampaignStatus.ON_HOLD
            return True
        return False

    def resume_campaign(self) -> bool:
        """Возобновить кампанию"""
        if self.status == CampaignStatus.ON_HOLD:
            self.status = CampaignStatus.ACTIVE
            return True
        return False

    def complete_campaign(self) -> bool:
        """Завершить кампанию"""
        if self.status in [CampaignStatus.ACTIVE, CampaignStatus.ON_HOLD]:
            self.status = CampaignStatus.COMPLETED
            return True
        return False

    def archive_campaign(self) -> bool:
        """Архивировать кампанию"""
        if self.status == CampaignStatus.COMPLETED:
            self.status = CampaignStatus.ARCHIVED
            return True
        return False

    def add_location(self, location: dict) -> None:
        """Добавить локацию"""
        locations = list(self.locations)
        locations.append(location)
        self.locations = locations

    def add_npc(self, npc: dict) -> None:
        """Добавить НПС"""
        npcs = list(self.npcs)
        npcs.append(npc)
        self.npcs = npcs

    def add_quest(self, quest: dict) -> None:
        """Добавить квест"""
        quests = list(self.quests)
        quests.append(quest)
        self.quests = quests

    def update_story_progress(self, key: str, value: any) -> None:
        """Обновить прогресс сюжета"""
        progress = dict(self.story_progress)
        progress[key] = value
        self.story_progress = progress

    def add_event(self, event: dict) -> None:
        """Добавить важное событие"""
        events = list(self.important_events)
        events.append(event)
        self.important_events = events

    def get_campaign_info(self) -> dict:
        """Получить информацию о кампании"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "setting": self.setting,
            "status": self.status.value,
            "creator_id": str(self.creator_id),
            "players": {
                "current": self.current_players,
                "max": self.max_players,
                "list": self.players,
            },
            "world": {
                "description": self.world_description,
                "locations_count": len(self.locations),
                "npcs_count": len(self.npcs),
                "quests_count": len(self.quests),
            },
            "story": {
                "main_story": self.main_story,
                "progress": self.story_progress,
                "events_count": len(self.important_events),
            },
            "settings": self.settings,
            "ai_settings": {
                "personality": self.ai_personality,
                "style": self.ai_style,
            },
            "statistics": {
                "total_sessions": self.total_sessions,
                "total_playtime": self.total_playtime,
            },
            "is_public": self.is_public,
            "requires_approval": self.requires_approval,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def get_public_info(self) -> dict:
        """Получить публичную информацию о кампании"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "setting": self.setting,
            "status": self.status.value,
            "players": {
                "current": self.current_players,
                "max": self.max_players,
            },
            "starting_level": self.starting_level,
            "statistics": {
                "total_sessions": self.total_sessions,
            },
            "created_at": self.created_at.isoformat(),
        }