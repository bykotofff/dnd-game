from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.config import settings
from app.models.user import User
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

# Контекст для хэширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """
    Сервис аутентификации и авторизации
    """

    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверить пароль"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    def get_password_hash(self, password: str) -> str:
        """Получить хэш пароля"""
        return pwd_context.hash(password)

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Создать access токен"""
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

        to_encode.update({"exp": expire, "type": "access"})

        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {e}")
            raise

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Создать refresh токен"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})

        try:
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating refresh token: {e}")
            raise

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверить и декодировать токен"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            return None

    async def authenticate_user(self, db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Аутентифицировать пользователя"""
        try:
            # Ищем пользователя по username или email
            query = select(User).where(
                (User.username == username) | (User.email == username)
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found: {username}")
                return None

            if not user.is_active:
                logger.warning(f"User is inactive: {username}")
                return None

            if not self.verify_password(password, user.hashed_password):
                logger.warning(f"Invalid password for user: {username}")
                return None

            # Обновляем время последнего входа
            user.last_login = datetime.utcnow()
            await db.commit()

            logger.info(f"User authenticated successfully: {username}")
            return user

        except Exception as e:
            logger.error(f"Error authenticating user {username}: {e}")
            return None

    async def create_user_tokens(self, user: User) -> Dict[str, str]:
        """Создать токены для пользователя"""
        user_data = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
        }

        access_token = self.create_access_token(user_data)
        refresh_token = self.create_refresh_token({"sub": str(user.id)})

        # Сохраняем сессию в Redis
        session_data = {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
            "last_activity": datetime.utcnow().isoformat(),
        }

        await redis_client.set_user_session(
            str(user.id),
            session_data,
            self.access_token_expire_minutes * 60
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    async def refresh_access_token(self, refresh_token: str, db: AsyncSession) -> Optional[Dict[str, str]]:
        """Обновить access токен используя refresh токен"""
        try:
            payload = self.verify_token(refresh_token)
            if not payload or payload.get("type") != "refresh":
                return None

            user_id = payload.get("sub")
            if not user_id:
                return None

            # Проверяем существование пользователя
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user or not user.is_active:
                return None

            # Создаем новые токены
            return await self.create_user_tokens(user)

        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    async def logout_user(self, user_id: str) -> bool:
        """Выйти из системы (удалить сессию)"""
        try:
            return await redis_client.delete_user_session(user_id)
        except Exception as e:
            logger.error(f"Error logging out user {user_id}: {e}")
            return False

    async def get_current_user(self, token: str, db: AsyncSession) -> Optional[User]:
        """Получить текущего пользователя по токену"""
        try:
            payload = self.verify_token(token)
            if not payload or payload.get("type") != "access":
                return None

            user_id = payload.get("sub")
            if not user_id:
                return None

            # Проверяем сессию в Redis
            session = await redis_client.get_user_session(user_id)
            if not session:
                return None

            # Получаем пользователя из базы
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if not user or not user.is_active:
                await redis_client.delete_user_session(user_id)
                return None

            # Обновляем время последней активности
            user.last_seen = datetime.utcnow()
            session["last_activity"] = datetime.utcnow().isoformat()
            await redis_client.set_user_session(
                user_id,
                session,
                self.access_token_expire_minutes * 60
            )

            return user

        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            return None

    async def validate_user_permissions(self, user: User, required_permissions: list = None) -> bool:
        """Проверить права пользователя"""
        if not user.is_active:
            return False

        if required_permissions:
            if "admin" in required_permissions and not user.is_admin:
                return False

        return True

    async def change_password(self, user: User, old_password: str, new_password: str, db: AsyncSession) -> bool:
        """Изменить пароль пользователя"""
        try:
            # Проверяем старый пароль
            if not self.verify_password(old_password, user.hashed_password):
                return False

            # Устанавливаем новый пароль
            user.hashed_password = self.get_password_hash(new_password)
            await db.commit()

            logger.info(f"Password changed for user: {user.username}")
            return True

        except Exception as e:
            logger.error(f"Error changing password for user {user.username}: {e}")
            await db.rollback()
            return False

    async def is_user_online(self, user_id: str) -> bool:
        """Проверить, онлайн ли пользователь"""
        try:
            session = await redis_client.get_user_session(user_id)
            if not session:
                return False

            last_activity = datetime.fromisoformat(session.get("last_activity", "1970-01-01"))
            timeout = timedelta(minutes=self.access_token_expire_minutes)

            return datetime.utcnow() - last_activity < timeout

        except Exception as e:
            logger.error(f"Error checking if user {user_id} is online: {e}")
            return False


# Глобальный экземпляр сервиса аутентификации
auth_service = AuthService()