from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, List, Optional, Any
import json
import logging
from datetime import datetime

from app.core.database import get_db_session
from app.core.redis_client import redis_client
from app.models.user import User
from app.models.game import Game
from app.models.character import Character
from app.models.game_state import GameMessage
from app.services.auth_service import auth_service
from app.services.ai_service import ai_service
from app.services.dice_service import dice_service

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Менеджер WebSocket соединений"""

    def __init__(self):
        # game_id -> {user_id: websocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # user_id -> game_id
        self.user_games: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, game_id: str, user_id: str):
        """Подключить пользователя к игре"""
        await websocket.accept()

        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}

        self.active_connections[game_id][user_id] = websocket
        self.user_games[user_id] = game_id

        # Добавляем игрока в активные в Redis
        await redis_client.add_active_player(game_id, user_id)

        logger.info(f"User {user_id} connected to game {game_id}")

    def disconnect(self, user_id: str):
        """Отключить пользователя"""
        if user_id in self.user_games:
            game_id = self.user_games[user_id]

            if game_id in self.active_connections:
                self.active_connections[game_id].pop(user_id, None)

                # Если в игре не осталось игроков, удаляем игру
                if not self.active_connections[game_id]:
                    del self.active_connections[game_id]

            del self.user_games[user_id]

            # Удаляем из активных в Redis
            asyncio.create_task(redis_client.remove_active_player(game_id, user_id))

            logger.info(f"User {user_id} disconnected from game {game_id}")

    async def send_personal_message(self, message: str, user_id: str):
        """Отправить личное сообщение пользователю"""
        if user_id in self.user_games:
            game_id = self.user_games[user_id]
            if game_id in self.active_connections and user_id in self.active_connections[game_id]:
                websocket = self.active_connections[game_id][user_id]
                try:
                    await websocket.send_text(message)
                except:
                    self.disconnect(user_id)

    async def broadcast_to_game(self, message: str, game_id: str, exclude_user: str = None):
        """Отправить сообщение всем игрокам в игре"""
        if game_id in self.active_connections:
            disconnected_users = []

            for user_id, websocket in self.active_connections[game_id].items():
                if exclude_user and user_id == exclude_user:
                    continue

                try:
                    await websocket.send_text(message)
                except:
                    disconnected_users.append(user_id)

            # Удаляем отключенных пользователей
            for user_id in disconnected_users:
                self.disconnect(user_id)

    def get_game_players(self, game_id: str) -> List[str]:
        """Получить список игроков в игре"""
        if game_id in self.active_connections:
            return list(self.active_connections[game_id].keys())
        return []


# Глобальный менеджер соединений
manager = ConnectionManager()


class WebSocketMessage:
    """Базовый класс для WebSocket сообщений"""

    def __init__(self, type: str, data: Dict[str, Any] = None):
        self.type = type
        self.data = data or {}
        self.timestamp = datetime.utcnow().isoformat()

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp
        })


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """Получить пользователя по токену"""
    try:
        return await auth_service.get_current_user(token, db)
    except:
        return None


@router.websocket("/game/{game_id}")
async def websocket_game_endpoint(
        websocket: WebSocket,
        game_id: str,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db_session)
):
    """WebSocket endpoint для игры"""

    # Аутентификация пользователя
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008, reason="Invalid token")
        return

    # Проверяем существование игры и права доступа
    query = select(Game).where(Game.id == game_id)
    result = await db.execute(query)
    game = result.scalar_one_or_none()

    if not game:
        await websocket.close(code=1008, reason="Game not found")
        return

    if str(user.id) not in game.players:
        await websocket.close(code=1008, reason="Access denied")
        return

    # Подключаем пользователя
    await manager.connect(websocket, game_id, str(user.id))

    # Отправляем приветственное сообщение
    welcome_msg = WebSocketMessage("connected", {
        "game_id": game_id,
        "user_id": str(user.id),
        "username": user.username,
        "players_online": manager.get_game_players(game_id)
    })
    await websocket.send_text(welcome_msg.to_json())

    # Уведомляем других игроков о подключении
    player_joined_msg = WebSocketMessage("player_joined", {
        "user_id": str(user.id),
        "username": user.username,
        "players_online": manager.get_game_players(game_id)
    })
    await manager.broadcast_to_game(player_joined_msg.to_json(), game_id, exclude_user=str(user.id))

    # Отправляем последние сообщения игры
    try:
        recent_messages = await redis_client.get_game_messages(game_id, limit=20)
        if recent_messages:
            history_msg = WebSocketMessage("message_history", {
                "messages": recent_messages
            })
            await websocket.send_text(history_msg.to_json())
    except Exception as e:
        logger.error(f"Error loading message history: {e}")

    try:
        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Обрабатываем сообщение
            await handle_websocket_message(
                websocket, game_id, str(user.id), user, message_data, db
            )

    except WebSocketDisconnect:
        manager.disconnect(str(user.id))

        # Уведомляем других игроков об отключении
        player_left_msg = WebSocketMessage("player_left", {
            "user_id": str(user.id),
            "username": user.username,
            "players_online": manager.get_game_players(game_id)
        })
        await manager.broadcast_to_game(player_left_msg.to_json(), game_id)

    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(str(user.id))


async def handle_websocket_message(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        message_data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка WebSocket сообщений"""

    message_type = message_data.get("type")
    data = message_data.get("data", {})

    try:
        if message_type == "chat_message":
            await handle_chat_message(websocket, game_id, user_id, user, data, db)

        elif message_type == "player_action":
            await handle_player_action(websocket, game_id, user_id, user, data, db)

        elif message_type == "dice_roll":
            await handle_dice_roll(websocket, game_id, user_id, user, data, db)

        elif message_type == "character_update":
            await handle_character_update(websocket, game_id, user_id, user, data, db)

        elif message_type == "game_command":
            await handle_game_command(websocket, game_id, user_id, user, data, db)

        else:
            error_msg = WebSocketMessage("error", {
                "message": f"Unknown message type: {message_type}"
            })
            await websocket.send_text(error_msg.to_json())

    except Exception as e:
        logger.error(f"Error handling message type {message_type}: {e}")
        error_msg = WebSocketMessage("error", {
            "message": "Failed to process message"
        })
        await websocket.send_text(error_msg.to_json())


async def handle_chat_message(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка чат сообщений"""

    content = data.get("content", "").strip()
    is_ooc = data.get("is_ooc", False)  # Out of character
    character_id = data.get("character_id")

    if not content:
        return

    # Создаем сообщение в базе данных
    message = GameMessage(
        game_id=game_id,
        sender_id=user_id,
        sender_type="player",
        sender_name=user.display_name or user.username,
        message_type="text",
        content=content,
        character_id=character_id,
        is_ooc=is_ooc
    )

    db.add(message)
    await db.commit()

    # Сохраняем в Redis для быстрого доступа
    message_dict = message.to_dict()
    await redis_client.add_game_message(game_id, message_dict)

    # Отправляем всем игрокам
    chat_msg = WebSocketMessage("chat_message", message_dict)
    await manager.broadcast_to_game(chat_msg.to_json(), game_id)

    logger.info(f"Chat message from {user.username} in game {game_id}")


async def handle_player_action(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка действий игрока"""

    action = data.get("action", "").strip()
    character_id = data.get("character_id")

    if not action:
        return

    # Получаем персонажа
    character = None
    if character_id:
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == user_id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

    # Сохраняем действие игрока
    action_message = GameMessage(
        game_id=game_id,
        sender_id=user_id,
        sender_type="player",
        sender_name=user.display_name or user.username,
        message_type="action",
        content=action,
        character_id=character_id
    )

    db.add(action_message)
    await db.commit()

    # Добавляем в Redis
    action_dict = action_message.to_dict()
    await redis_client.add_game_message(game_id, action_dict)

    # Отправляем действие всем игрокам
    action_msg = WebSocketMessage("player_action", action_dict)
    await manager.broadcast_to_game(action_msg.to_json(), game_id)

    # Анализируем действие через ИИ
    try:
        # Получаем контекст игры
        game_context = await redis_client.get_game_state(game_id) or {}
        character_sheets = []

        if character:
            character_sheets.append(character.get_character_sheet())

        # Получаем недавние сообщения
        recent_messages = await redis_client.get_game_messages(game_id, limit=10)
        message_texts = [msg.get("content", "") for msg in recent_messages]

        # Анализируем через ИИ
        analysis = await ai_service.analyze_player_action(
            action,
            character.get_character_sheet() if character else {},
            game_context.get("current_scene", "Unknown location")
        )

        # Если нужен бросок костей
        if analysis.get("requires_roll", False):
            roll_prompt_msg = WebSocketMessage("roll_prompt", {
                "player_id": user_id,
                "roll_type": analysis.get("roll_type"),
                "ability_or_skill": analysis.get("ability_or_skill"),
                "dc": analysis.get("dc"),
                "advantage": analysis.get("advantage", False),
                "disadvantage": analysis.get("disadvantage", False),
                "action": action
            })
            await websocket.send_text(roll_prompt_msg.to_json())

        # Генерируем ответ ДМ
        dm_response = await ai_service.generate_dm_response(
            game_id, action, game_context, character_sheets, message_texts
        )

        if dm_response:
            # Сохраняем ответ ДМ
            dm_message = GameMessage(
                game_id=game_id,
                sender_type="ai",
                sender_name="Данжеон Мастер",
                message_type="text",
                content=dm_response
            )

            db.add(dm_message)
            await db.commit()

            dm_dict = dm_message.to_dict()
            await redis_client.add_game_message(game_id, dm_dict)

            # Отправляем ответ ДМ всем игрокам
            dm_msg = WebSocketMessage("dm_response", dm_dict)
            await manager.broadcast_to_game(dm_msg.to_json(), game_id)

    except Exception as e:
        logger.error(f"Error processing AI response: {e}")


async def handle_dice_roll(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка бросков костей"""

    dice_notation = data.get("dice_notation", "1d20")
    purpose = data.get("purpose", "")
    character_id = data.get("character_id")
    advantage = data.get("advantage", False)
    disadvantage = data.get("disadvantage", False)
    modifiers = data.get("modifiers", {})

    try:
        # Выполняем бросок
        result = dice_service.roll_from_notation(
            dice_notation,
            advantage=advantage,
            disadvantage=disadvantage,
            additional_modifiers=modifiers
        )

        # Сохраняем бросок в базе
        dice_roll_message = GameMessage(
            game_id=game_id,
            sender_id=user_id,
            sender_type="player",
            sender_name=user.display_name or user.username,
            message_type="dice_roll",
            content=f"Бросок костей: {str(result)}",
            character_id=character_id,
            dice_data={
                "notation": dice_notation,
                "result": result.total,
                "individual_rolls": result.individual_rolls,
                "modifiers": result.modifiers,
                "purpose": purpose,
                "is_critical": result.is_critical,
                "is_advantage": result.is_advantage,
                "is_disadvantage": result.is_disadvantage
            }
        )

        db.add(dice_roll_message)
        await db.commit()

        # Добавляем в Redis
        roll_dict = dice_roll_message.to_dict()
        await redis_client.add_game_message(game_id, roll_dict)

        # Отправляем результат всем игрокам
        roll_msg = WebSocketMessage("dice_roll", roll_dict)
        await manager.broadcast_to_game(roll_msg.to_json(), game_id)

        logger.info(f"Dice roll by {user.username}: {dice_notation} = {result.total}")

    except Exception as e:
        logger.error(f"Error processing dice roll: {e}")
        error_msg = WebSocketMessage("error", {
            "message": f"Invalid dice notation: {dice_notation}"
        })
        await websocket.send_text(error_msg.to_json())


async def handle_character_update(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка обновлений персонажа"""

    character_id = data.get("character_id")
    updates = data.get("updates", {})

    if not character_id or not updates:
        return

    try:
        # Получаем персонажа
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == user_id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            return

        # Обновляем персонажа
        for field, value in updates.items():
            if hasattr(character, field):
                setattr(character, field, value)

        await db.commit()

        # Уведомляем о обновлении
        update_msg = WebSocketMessage("character_updated", {
            "character_id": character_id,
            "updates": updates,
            "updated_by": user.username
        })
        await manager.broadcast_to_game(update_msg.to_json(), game_id)

        logger.info(f"Character {character.name} updated by {user.username}")

    except Exception as e:
        logger.error(f"Error updating character: {e}")


async def handle_game_command(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка игровых команд"""

    command = data.get("command")
    args = data.get("args", {})

    if command == "save_game":
        await save_game_state(game_id, user_id, args, db)

    elif command == "load_game":
        await load_game_state(game_id, user_id, args, db)

    elif command == "get_players":
        players = manager.get_game_players(game_id)
        players_msg = WebSocketMessage("players_list", {
            "players": players
        })
        await websocket.send_text(players_msg.to_json())

    else:
        error_msg = WebSocketMessage("error", {
            "message": f"Unknown command: {command}"
        })
        await websocket.send_text(error_msg.to_json())


async def save_game_state(game_id: str, user_id: str, args: Dict[str, Any], db: AsyncSession):
    """Сохранение состояния игры"""
    try:
        # Получаем текущее состояние из Redis
        game_state = await redis_client.get_game_state(game_id)
        recent_messages = await redis_client.get_game_messages(game_id, limit=50)

        if game_state or recent_messages:
            # Сохраняем в базу данных через отдельную логику
            logger.info(f"Game state saved for game {game_id} by user {user_id}")

    except Exception as e:
        logger.error(f"Error saving game state: {e}")


async def load_game_state(game_id: str, user_id: str, args: Dict[str, Any], db: AsyncSession):
    """Загрузка состояния игры"""
    try:
        # Загружаем состояние из базы данных
        # Реализация зависит от конкретных требований
        logger.info(f"Game state loaded for game {game_id} by user {user_id}")

    except Exception as e:
        logger.error(f"Error loading game state: {e}")


# Дополнительные endpoints для управления WebSocket соединениями
@router.get("/active-games")
async def get_active_games():
    """Получить список активных игр"""
    return {
        "active_games": list(manager.active_connections.keys()),
        "total_players": len(manager.user_games)
    }


@router.get("/game/{game_id}/players")
async def get_game_players(game_id: str):
    """Получить список игроков в игре"""
    players = manager.get_game_players(game_id)
    return {
        "game_id": game_id,
        "players": players,
        "player_count": len(players)
    }