import redis.asyncio as aioredis
import json
import logging
from typing import Any, Optional, Dict, List
from datetime import timedelta

from app.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Асинхронный клиент для Redis
    Используется для кэширования, сессий и игровых состояний
    """

    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self.url = settings.REDIS_URL

    async def connect(self):
        """Подключение к Redis"""
        try:
            self.redis = aioredis.from_url(
                self.url,
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
            )
            # Проверяем соединение
            await self.redis.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Отключение от Redis"""
        if self.redis:
            await self.redis.aclose()
            logger.info("Disconnected from Redis")

    async def health_check(self) -> bool:
        """Проверка здоровья Redis"""
        try:
            if not self.redis:
                return False
            await self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    # Базовые операции
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Сохранить значение с опциональным TTL"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)

            if ttl:
                await self.redis.setex(key, ttl, value)
            else:
                await self.redis.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Получить значение по ключу"""
        try:
            value = await self.redis.get(key)
            if value is None:
                return None

            # Пытаемся распарсить как JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None

    async def delete(self, key: str) -> bool:
        """Удалить ключ"""
        try:
            result = await self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Проверить существование ключа"""
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False

    async def expire(self, key: str, ttl: int) -> bool:
        """Установить TTL для существующего ключа"""
        try:
            return await self.redis.expire(key, ttl)
        except Exception as e:
            logger.error(f"Redis EXPIRE error for key {key}: {e}")
            return False

    # Операции со списками
    async def lpush(self, key: str, *values) -> int:
        """Добавить элементы в начало списка"""
        try:
            json_values = [json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for v in values]
            return await self.redis.lpush(key, *json_values)
        except Exception as e:
            logger.error(f"Redis LPUSH error for key {key}: {e}")
            return 0

    async def rpush(self, key: str, *values) -> int:
        """Добавить элементы в конец списка"""
        try:
            json_values = [json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for v in values]
            return await self.redis.rpush(key, *json_values)
        except Exception as e:
            logger.error(f"Redis RPUSH error for key {key}: {e}")
            return 0

    async def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Получить элементы списка"""
        try:
            values = await self.redis.lrange(key, start, end)
            result = []
            for value in values:
                try:
                    result.append(json.loads(value))
                except (json.JSONDecodeError, TypeError):
                    result.append(value)
            return result
        except Exception as e:
            logger.error(f"Redis LRANGE error for key {key}: {e}")
            return []

    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """Обрезать список"""
        try:
            await self.redis.ltrim(key, start, end)
            return True
        except Exception as e:
            logger.error(f"Redis LTRIM error for key {key}: {e}")
            return False

    # Операции с хэшами
    async def hset(self, key: str, field: str, value: Any) -> bool:
        """Установить поле хэша"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            await self.redis.hset(key, field, value)
            return True
        except Exception as e:
            logger.error(f"Redis HSET error for key {key}, field {field}: {e}")
            return False

    async def hget(self, key: str, field: str) -> Optional[Any]:
        """Получить поле хэша"""
        try:
            value = await self.redis.hget(key, field)
            if value is None:
                return None

            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis HGET error for key {key}, field {field}: {e}")
            return None

    async def hgetall(self, key: str) -> Dict[str, Any]:
        """Получить все поля хэша"""
        try:
            data = await self.redis.hgetall(key)
            result = {}
            for field, value in data.items():
                try:
                    result[field] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    result[field] = value
            return result
        except Exception as e:
            logger.error(f"Redis HGETALL error for key {key}: {e}")
            return {}

    async def hdel(self, key: str, *fields) -> int:
        """Удалить поля хэша"""
        try:
            return await self.redis.hdel(key, *fields)
        except Exception as e:
            logger.error(f"Redis HDEL error for key {key}: {e}")
            return 0

    # Специальные методы для игры
    async def set_game_state(self, game_id: str, state: Dict[str, Any], ttl: int = None) -> bool:
        """Сохранить состояние игры"""
        key = f"game_state:{game_id}"
        return await self.set(key, state, ttl or settings.GAME_SESSION_TTL)

    async def get_game_state(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Получить состояние игры"""
        key = f"game_state:{game_id}"
        return await self.get(key)

    async def add_game_message(self, game_id: str, message: Dict[str, Any]) -> bool:
        """Добавить сообщение в историю игры"""
        key = f"game_messages:{game_id}"
        result = await self.lpush(key, message)
        # Ограничиваем историю последними 100 сообщениями
        await self.ltrim(key, 0, 99)
        return result > 0

    async def get_game_messages(self, game_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Получить последние сообщения игры"""
        key = f"game_messages:{game_id}"
        return await self.lrange(key, 0, limit - 1)

    async def set_user_session(self, user_id: str, session_data: Dict[str, Any], ttl: int = None) -> bool:
        """Сохранить сессию пользователя"""
        key = f"user_session:{user_id}"
        return await self.set(key, session_data, ttl or settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    async def get_user_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Получить сессию пользователя"""
        key = f"user_session:{user_id}"
        return await self.get(key)

    async def delete_user_session(self, user_id: str) -> bool:
        """Удалить сессию пользователя"""
        key = f"user_session:{user_id}"
        return await self.delete(key)

    async def cache_ai_context(self, game_id: str, context: str, ttl: int = None) -> bool:
        """Кэшировать контекст для ИИ"""
        key = f"ai_context:{game_id}"
        return await self.set(key, context, ttl or settings.CONTEXT_CACHE_TTL)

    async def get_ai_context(self, game_id: str) -> Optional[str]:
        """Получить кэшированный контекст ИИ"""
        key = f"ai_context:{game_id}"
        return await self.get(key)

    async def set_active_players(self, game_id: str, player_ids: List[str]) -> bool:
        """Установить список активных игроков"""
        key = f"active_players:{game_id}"
        return await self.set(key, player_ids, settings.GAME_SESSION_TTL)

    async def get_active_players(self, game_id: str) -> List[str]:
        """Получить список активных игроков"""
        key = f"active_players:{game_id}"
        result = await self.get(key)
        return result if result else []

    async def add_active_player(self, game_id: str, player_id: str) -> bool:
        """Добавить активного игрока"""
        players = await self.get_active_players(game_id)
        if player_id not in players:
            players.append(player_id)
            return await self.set_active_players(game_id, players)
        return True

    async def remove_active_player(self, game_id: str, player_id: str) -> bool:
        """Удалить активного игрока"""
        players = await self.get_active_players(game_id)
        if player_id in players:
            players.remove(player_id)
            return await self.set_active_players(game_id, players)
        return True


# Глобальный экземпляр Redis клиента
redis_client = RedisClient()