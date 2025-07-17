# backend/app/api/websocket.py - ИСПРАВЛЕННАЯ ВЕРСИЯ

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db_session
from app.models.game import Game
from app.models.user import User
from app.models.character import Character

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Менеджер WebSocket соединений для игр"""

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: str, user_id: str):
        """Подключение пользователя к игре"""
        await websocket.accept()

        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}

        self.active_connections[game_id][user_id] = websocket
        logger.info(f"User {user_id} connected to game {game_id}")

    async def disconnect(self, game_id: str, user_id: str):
        """Отключение пользователя от игры"""
        if game_id in self.active_connections:
            if user_id in self.active_connections[game_id]:
                del self.active_connections[game_id][user_id]
                logger.info(f"User {user_id} disconnected from game {game_id}")

            # Удаляем игру если нет подключенных пользователей
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast_to_game(self, message: str, game_id: str, exclude_user: Optional[str] = None):
        """Отправка сообщения всем пользователям в игре"""
        if game_id in self.active_connections:
            disconnected_users = []

            for user_id, websocket in self.active_connections[game_id].items():
                if exclude_user and user_id == exclude_user:
                    continue

                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.warning(f"Failed to send message to user {user_id} in game {game_id}: {e}")
                    disconnected_users.append(user_id)

            # Удаляем отключенных пользователей
            for user_id in disconnected_users:
                await self.disconnect(game_id, user_id)

    def get_connected_users(self, game_id: str) -> List[str]:
        """Получить список подключенных пользователей в игре"""
        if game_id in self.active_connections:
            return list(self.active_connections[game_id].keys())
        return []


# Глобальный менеджер соединений
manager = ConnectionManager()


class WebSocketMessage:
    """Класс для структурированных WebSocket сообщений"""

    def __init__(self, message_type: str, data: Dict[str, Any]):
        self.type = message_type
        self.data = data

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "data": self.data
        })


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """Получить пользователя по токену"""
    try:
        from app.api.auth import auth_service
        return await auth_service.get_current_user(token, db)
    except Exception as e:
        logger.warning(f"Failed to get user from token: {e}")
        return None


async def get_player_character_info(game: Game, user_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
    """Получить информацию о персонаже игрока"""
    try:
        if not game.player_characters:
            return None

        character_id = game.player_characters.get(user_id)
        if not character_id:
            return None

        query = select(Character).where(Character.id == character_id)
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if character:
            return {
                "id": str(character.id),
                "name": character.name,
                "race": character.race,
                "character_class": character.character_class,
                "level": character.level,
                "current_hit_points": character.current_hit_points,
                "max_hit_points": character.max_hit_points,
                "armor_class": character.armor_class,
                "abilities": {
                    "strength": character.strength,
                    "dexterity": character.dexterity,
                    "constitution": character.constitution,
                    "intelligence": character.intelligence,
                    "wisdom": character.wisdom,
                    "charisma": character.charisma,
                },
                "skills": character.skills or {},
                "background": character.background,
            }
    except Exception as e:
        logger.error(f"Error getting character info for user {user_id}: {e}")

    return None


async def get_game_state_for_player(game: Game, user: User, character_info: Optional[Dict], db: AsyncSession) -> Dict[str, Any]:
    """Получить состояние игры для конкретного игрока"""
    try:
        # Получаем информацию о всех игроках и их персонажах
        players_info = {}
        if game.players:
            users_query = select(User).where(User.id.in_(game.players))
            users_result = await db.execute(users_query)
            users = {str(u.id): u for u in users_result.scalars().all()}

            for player_id in game.players:
                player_user = users.get(player_id)
                player_char_info = await get_player_character_info(game, player_id, db)

                players_info[player_id] = {
                    "user_id": player_id,
                    "username": player_user.username if player_user else "Неизвестный игрок",
                    "character_name": player_char_info.get('name') if player_char_info else (player_user.username if player_user else "Неизвестный"),
                    "character_info": player_char_info,
                    "is_online": True,  # Предполагаем что все подключенные игроки онлайн
                    "is_current_user": player_id == str(user.id)
                }

        # ✅ ИСПРАВЛЕНО: Получаем данные из turn_info вместо прямых атрибутов
        turn_info = game.turn_info or {}

        return {
            "game_id": str(game.id),
            "game_name": game.name,
            "status": game.status.value,
            "current_scene": game.current_scene,
            "players": players_info,
            "your_character": character_info,
            "turn_info": {
                # ✅ ИСПРАВЛЕНО: Используем данные из JSONB поля turn_info
                "current_turn": turn_info.get("current_turn", 0),
                "current_player_index": turn_info.get("current_player_index", 0),
                "current_player_id": turn_info.get("current_player_id"),
                "round_number": turn_info.get("round_number", 1),
                "initiative_order": turn_info.get("initiative_order", [])
            },
            "world_state": dict(game.world_state) if game.world_state else {},
            "settings": dict(game.settings) if game.settings else {},
        }

    except Exception as e:
        logger.error(f"Error getting game state: {e}")
        return {
            "game_id": str(game.id),
            "game_name": game.name,
            "status": game.status.value,
            "players": {},
            "error": "Failed to load game state"
        }


async def handle_chat_message(websocket: WebSocket, game_id: str, user_id: str, user: User, character_name: str, data: Dict[str, Any], db: AsyncSession):
    """Обработка сообщений чата с именем персонажа"""
    try:
        content = data.get("content", "").strip()
        if not content:
            return

        # Создаем сообщение с именем персонажа
        chat_message = WebSocketMessage("chat_message", {
            "content": content,
            "sender_id": user_id,
            "sender_name": character_name,  # Используем имя персонажа
            "sender_username": user.username,  # Сохраняем и username для технических целей
            "timestamp": datetime.utcnow().isoformat(),
            "message_type": "chat"
        })

        # Рассылаем сообщение всем игрокам
        await manager.broadcast_to_game(chat_message.to_json(), game_id)

        logger.info(f"Chat message from {character_name} ({user.username}) in game {game_id}: {content[:50]}...")

    except Exception as e:
        logger.error(f"Error handling chat message: {e}")


async def handle_player_action(websocket: WebSocket, game_id: str, user_id: str, user: User, character_name: str, character_info: Optional[Dict], data: Dict[str, Any], db: AsyncSession):
    """Обработка действий игрока"""
    try:
        action = data.get("action", "").strip()
        if not action:
            return

        # Создаем сообщение о действии
        action_message = WebSocketMessage("player_action", {
            "action": action,
            "character_name": character_name,
            "character_id": character_info.get("id") if character_info else None,
            "player_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Рассылаем действие всем игрокам
        await manager.broadcast_to_game(action_message.to_json(), game_id)

        logger.info(f"Player action from {character_name} in game {game_id}: {action[:50]}...")

    except Exception as e:
        logger.error(f"Error handling player action: {e}")


async def handle_dice_roll(websocket: WebSocket, game_id: str, user_id: str, user: User, character_name: str, data: Dict[str, Any], db: AsyncSession):
    """Обработка бросков кубиков"""
    try:
        notation = data.get("notation", "").strip()
        purpose = data.get("purpose", "")

        if not notation:
            return

        # Простая симуляция броска (замените на реальную логику)
        import random

        # Парсим простой формат вроде "1d20", "2d6+3"
        total = random.randint(1, 20)  # Упрощенно

        # Создаем сообщение о броске
        dice_message = WebSocketMessage("dice_roll", {
            "notation": notation,
            "total": total,
            "character_name": character_name,
            "player_id": user_id,
            "purpose": purpose,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Рассылаем результат броска всем игрокам
        await manager.broadcast_to_game(dice_message.to_json(), game_id)

        logger.info(f"Dice roll from {character_name} in game {game_id}: {notation} = {total}")

    except Exception as e:
        logger.error(f"Error handling dice roll: {e}")


@router.websocket("/game/{game_id}")
async def websocket_game_endpoint(
        websocket: WebSocket,
        game_id: str,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db_session)
):
    """WebSocket endpoint для игры с поддержкой персонажей"""
    user = None
    character_info = None
    character_name = None

    try:
        # Аутентификация пользователя
        user = await get_user_from_token(token, db)
        if not user:
            logger.warning(f"Invalid token for WebSocket connection to game {game_id}")
            await websocket.close(code=1008, reason="Invalid token")
            return

        # Проверяем существование игры
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.warning(f"Game {game_id} not found")
            await websocket.close(code=1008, reason="Game not found")
            return

        user_id_str = str(user.id)

        # Получаем информацию о персонаже игрока
        character_info = await get_player_character_info(game, user_id_str, db)
        character_name = character_info.get('name') if character_info else user.username

        # Подключаемся к игре
        await manager.connect(websocket, game_id, user_id_str)

        # Отправляем приветственное сообщение
        welcome_message = WebSocketMessage("system", {
            "message": f"🎭 {character_name} присоединился к игре",
            "player_name": character_name,
            "user_id": user_id_str,
            "character_info": character_info,
            "timestamp": datetime.utcnow().isoformat()
        })

        await manager.broadcast_to_game(welcome_message.to_json(), game_id, exclude_user=user_id_str)

        # Отправляем текущее состояние игры новому игроку
        game_state = await get_game_state_for_player(game, user, character_info, db)
        state_message = WebSocketMessage("game_state", game_state)
        await websocket.send_text(state_message.to_json())

        # Основной цикл обработки сообщений
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                message_type = message_data.get("type")

                if message_type == "chat_message":
                    await handle_chat_message(websocket, game_id, user_id_str, user, character_name, message_data, db)
                elif message_type == "player_action":
                    await handle_player_action(websocket, game_id, user_id_str, user, character_name, character_info, message_data, db)
                elif message_type == "dice_roll":
                    await handle_dice_roll(websocket, game_id, user_id_str, user, character_name, message_data, db)
                elif message_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                else:
                    logger.warning(f"Unknown message type: {message_type}")

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user.username} in game {game_id}")
                break
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user.id}")
                continue
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                continue

    except Exception as e:
        logger.error(f"WebSocket error for game {game_id}: {e}")
    finally:
        if user:
            await manager.disconnect(game_id, str(user.id))

            # Отправляем сообщение о выходе с именем персонажа
            if character_name:
                disconnect_message = WebSocketMessage("system", {
                    "message": f"🚪 {character_name} покинул игру",
                    "player_name": character_name,
                    "user_id": str(user.id),
                    "timestamp": datetime.utcnow().isoformat()
                })
                await manager.broadcast_to_game(disconnect_message.to_json(), game_id)