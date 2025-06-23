from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .base import BaseModel


class User(BaseModel):
    """
    Модель пользователя
    """
    __tablename__ = "users"

    # Основная информация
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Профиль
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)

    # Статус аккаунта
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Игровые настройки
    preferences = Column(JSONB, default={}, nullable=False)  # Настройки интерфейса, звука и т.д.

    # Статистика
    games_played = Column(Integer, default=0, nullable=False)
    total_playtime = Column(Integer, default=0, nullable=False)  # В минутах

    # Последняя активность
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # Связи
    characters = relationship("Character", back_populates="owner", cascade="all, delete-orphan")
    created_campaigns = relationship("Campaign", back_populates="creator", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"

    def get_public_profile(self) -> dict:
        """Получить публичную информацию профиля"""
        return {
            "id": str(self.id),
            "username": self.username,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "games_played": self.games_played,
            "created_at": self.created_at.isoformat(),
        }

    def get_full_profile(self) -> dict:
        """Получить полную информацию профиля (для владельца)"""
        profile = self.get_public_profile()
        profile.update({
            "email": self.email,
            "is_verified": self.is_verified,
            "preferences": self.preferences,
            "total_playtime": self.total_playtime,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
        })
        return profile