# backend/app/api/websocket.py - Исправленный WebSocket endpoint

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, List, Optional, Any
import json
import logging
import asyncio  # ✅ ДОБАВИЛИ ИМПОРТ
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
        try:
            await redis_client.add_active_player(game_id, user_id)
        except Exception as e:
            logger.warning(f"Failed to add active player to Redis: {e}")

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
            try:
                asyncio.create_task(redis_client.remove_active_player(game_id, user_id))
            except Exception as e:
                logger.warning(f"Failed to remove active player from Redis: {e}")

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
    except Exception as e:
        logger.warning(f"Failed to get user from token: {e}")
        return None


@router.websocket("/game/{game_id}")
async def websocket_game_endpoint(
        websocket: WebSocket,
        game_id: str,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db_session)
):
    """WebSocket endpoint для игры"""
    user = None

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
            logger.warning(f"Game {game_id} not found for user {user.id}")
            await websocket.close(code=1008, reason="Game not found")
            return

        # ✅ ИСПРАВЛЕНИЕ: Более мягкая проверка доступа
        # Позволяем подключение если пользователь есть в players ИЛИ это создатель кампании
        user_id_str = str(user.id)
        players_list = game.players or []

        # Получаем информацию о кампании для проверки создателя
        from app.models.campaign import Campaign
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one_or_none()

        is_creator = campaign and str(campaign.creator_id) == user_id_str
        is_player = user_id_str in players_list
        is_participant = campaign and user_id_str in (campaign.players or [])

        if not (is_player or is_creator or is_participant):
            logger.warning(f"Access denied for user {user.id} to game {game_id}")
            await websocket.close(code=1008, reason="Access denied")
            return

        # ✅ АВТОМАТИЧЕСКИ ДОБАВЛЯЕМ ИГРОКА В ИГРУ если его там нет
        if not is_player and (is_creator or is_participant):
            if user_id_str not in players_list:
                players_list.append(user_id_str)
                game.players = players_list
                game.current_players = len(players_list)
                await db.commit()
                logger.info(f"Added user {user.id} to game {game_id} players list")

        # Подключаем пользователя
        await manager.connect(websocket, game_id, user_id_str)

        # Отправляем приветственное сообщение
        welcome_msg = WebSocketMessage("connected", {
            "game_id": game_id,
            "user_id": user_id_str,
            "username": user.username,
            "players_online": manager.get_game_players(game_id)
        })
        await websocket.send_text(welcome_msg.to_json())

        # Уведомляем других игроков о подключении
        player_joined_msg = WebSocketMessage("player_joined", {
            "user_id": user_id_str,
            "username": user.username,
            "players_online": manager.get_game_players(game_id)
        })
        await manager.broadcast_to_game(player_joined_msg.to_json(), game_id, exclude_user=user_id_str)

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

        # Основной цикл обработки сообщений
        while True:
            try:
                # Получаем сообщение от клиента
                data = await websocket.receive_text()
                message_data = json.loads(data)

                # Обрабатываем сообщение
                await handle_websocket_message(
                    websocket, game_id, user_id_str, user, message_data, db
                )
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON from user {user.id}: {e}")
                error_msg = WebSocketMessage("error", {"message": "Invalid message format"})
                await websocket.send_text(error_msg.to_json())

    except WebSocketDisconnect:
        if user:
            manager.disconnect(str(user.id))
            # Уведомляем других игроков об отключении
            player_left_msg = WebSocketMessage("player_left", {
                "user_id": str(user.id),
                "username": user.username,
                "players_online": manager.get_game_players(game_id)
            })
            await manager.broadcast_to_game(player_left_msg.to_json(), game_id)

    except Exception as e:
        logger.error(f"WebSocket error for user {user.id if user else 'unknown'}: {e}")
        if user:
            manager.disconnect(str(user.id))


async def handle_websocket_message(
        websocket: WebSocket,
        game_id: str,
        user_id: str,
        user: User,
        data: Dict[str, Any],
        db: AsyncSession
):
    """Обработка WebSocket сообщений от клиента"""
    try:
        message_type = data.get("type", "unknown")
        message_data = data.get("data", {})

        logger.info(f"Received {message_type} from user {user_id} in game {game_id}")

        if message_type == "chat_message":
            await handle_chat_message(websocket, game_id, user_id, user, message_data, db)

        elif message_type == "player_action":
            await handle_player_action(websocket, game_id, user_id, user, message_data, db)

        elif message_type == "dice_roll":
            await handle_dice_roll(websocket, game_id, user_id, user, message_data, db)

        elif message_type == "join_game":
            # Уже обработано при подключении
            pass

        elif message_type == "leave_game":
            manager.disconnect(user_id)

        elif message_type == "ping":
            # Heartbeat - отправляем pong
            pong_msg = WebSocketMessage("pong", {"timestamp": datetime.utcnow().isoformat()})
            await websocket.send_text(pong_msg.to_json())

        else:
            logger.warning(f"Unknown message type: {message_type}")
            error_msg = WebSocketMessage("error", {"message": f"Unknown message type: {message_type}"})
            await websocket.send_text(error_msg.to_json())

    except Exception as e:
        logger.error(f"Error handling WebSocket message: {e}")
        error_msg = WebSocketMessage("error", {"message": "Internal server error"})
        await websocket.send_text(error_msg.to_json())


async def handle_chat_message(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Обработка чат сообщений"""
    content = data.get("content", "").strip()
    if not content:
        return

    # Создаем сообщение для рассылки
    chat_msg = WebSocketMessage("chat_message", {
        "content": content,
        "sender_id": user_id,
        "sender_name": user.username,
        "timestamp": datetime.utcnow().isoformat(),
        "is_ooc": data.get("is_ooc", False)
    })

    # Сохраняем в Redis
    try:
        await redis_client.add_game_message(game_id, {
            "type": "chat",
            "content": content,
            "sender_id": user_id,
            "sender_name": user.username,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to save message to Redis: {e}")

    # Рассылаем всем игрокам
    await manager.broadcast_to_game(chat_msg.to_json(), game_id)


async def handle_player_action(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Обработка действий игрока"""
    action = data.get("action", "").strip()
    if not action:
        return

    # Создаем сообщение о действии
    action_msg = WebSocketMessage("player_action", {
        "action": action,
        "player_id": user_id,
        "player_name": user.username,
        "timestamp": datetime.utcnow().isoformat()
    })

    # Рассылаем всем игрокам
    await manager.broadcast_to_game(action_msg.to_json(), game_id)


async def handle_dice_roll(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Обработка броска костей"""
    notation = data.get("notation", "").strip()
    if not notation:
        return

    try:
        # Выполняем бросок
        result = dice_service.roll_dice(notation)

        # Создаем сообщение о броске
        dice_msg = WebSocketMessage("dice_roll", {
            "notation": notation,
            "result": result,
            "player_id": user_id,
            "player_name": user.username,
            "purpose": data.get("purpose", ""),
            "timestamp": datetime.utcnow().isoformat()
        })

        # Рассылаем всем игрокам
        await manager.broadcast_to_game(dice_msg.to_json(), game_id)

    except Exception as e:
        logger.error(f"Error rolling dice: {e}")
        error_msg = WebSocketMessage("error", {"message": "Failed to roll dice"})
        await websocket.send_text(error_msg.to_json())


# HTTP endpoints для управления WebSocket соединениями
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