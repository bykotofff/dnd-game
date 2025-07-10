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

        elif message_type == "request_game_state":
            await handle_request_game_state(websocket, game_id, user_id, user, message_data, db)

        elif message_type == "request_message_history":
            await handle_request_message_history(websocket, game_id, user_id, user, message_data, db)

        elif message_type == "request_scene_info":
            await handle_request_scene_info(websocket, game_id, user_id, user, message_data, db)

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

    # ✅ НОВОЕ: Автоматически анализируем действие и запрашиваем ответ от ИИ
    try:
        # Получаем информацию об игре для контекста
        from app.models.game import Game
        from sqlalchemy import select

        game_query = select(Game).where(Game.id == game_id)
        result = await db.execute(game_query)
        game = result.scalar_one_or_none()

        if game:
            # Подготавливаем контекст для ИИ
            context = {
                "game_name": game.name,
                "current_scene": game.current_scene,
                "player_action": action,
                "player_name": user.username,
                "game_id": game_id
            }

            # Анализируем действие и отправляем запрос к ИИ
            asyncio.create_task(handle_ai_response_with_dice_check(
                game_id, action, context, user.username, user_id
            ))

    except Exception as ai_error:
        logger.warning(f"Failed to trigger AI response: {ai_error}")


async def handle_ai_response_with_dice_check(game_id: str, player_action: str, context: dict, player_name: str, user_id: str):
    """Улучшенная обработка ответа ИИ с проверками кубиками"""
    try:
        logger.info(f"Starting AI response with dice check for player {player_name}")

        # Проверяем health AI сервиса
        ai_health = await ai_service.health_check()
        if not ai_health:
            logger.warning("AI service is not available")
            await send_fallback_ai_response(game_id, player_action, player_name)
            return

        # ✅ ШАГ 1: Анализируем действие игрока для определения нужных проверок
        character_data = {
            "name": player_name,
            "class": "Fighter",  # Пока заглушка, позже можно получать из БД
        }

        dice_analysis = await ai_service.analyze_player_action(
            action=player_action,
            character_data=character_data,
            current_situation=context.get('current_scene', 'Unknown situation')
        )

        logger.info(f"Dice analysis result: {dice_analysis}")

        # ✅ ШАГ 2: Если нужна проверка, запрашиваем бросок
        if dice_analysis.get("requires_roll", False):
            await request_dice_roll(game_id, dice_analysis, player_name, player_action)
            return  # Ждем результата броска, ИИ ответит после получения результата

        # ✅ ШАГ 3: Если проверка не нужна, генерируем обычный ответ ИИ
        ai_response = await ai_service.generate_dm_response(
            game_id=game_id,
            player_action=player_action,
            game_context=context,
            character_sheets=[character_data],
            recent_messages=[]
        )

        if not ai_response:
            ai_response = f"🤖 *ИИ Мастер задумался над действием {player_name}. Попробуйте описать свои намерения более подробно!*"

        # Отправляем ответ ИИ
        ai_msg = WebSocketMessage("ai_response", {
            "message": ai_response,
            "sender_name": "ИИ Мастер",
            "timestamp": datetime.utcnow().isoformat(),
            "in_response_to": player_action,
            "responding_to_player": player_name
        })

        await manager.broadcast_to_game(ai_msg.to_json(), game_id)
        logger.info(f"AI response sent for action by {player_name}")

    except Exception as e:
        logger.error(f"Error in AI response with dice check: {e}", exc_info=True)
        await send_fallback_ai_response(game_id, player_action, player_name)


async def request_dice_roll(game_id: str, dice_analysis: dict, player_name: str, original_action: str):
    """Запрос броска кубиков от игрока"""
    try:
        roll_type = dice_analysis.get("roll_type", "проверка_навыка")
        ability_or_skill = dice_analysis.get("ability_or_skill", "восприятие")
        dc = int(dice_analysis.get("suggested_dc", 15))
        advantage_disadvantage = dice_analysis.get("advantage_disadvantage", "обычно")

        advantage = advantage_disadvantage == "преимущество"
        disadvantage = advantage_disadvantage == "помеха"

        # Формируем сообщение с запросом броска
        roll_request_msg = f"""🎲 **{player_name}**, для действия "{original_action}" требуется проверка!

**Тип проверки:** {get_roll_type_description(roll_type)}
**Навык/Характеристика:** {get_ability_description(ability_or_skill)}
**Сложность (DC):** {dc}
{f"**Преимущество:** Да ✅" if advantage else ""}
{f"**Помеха:** Да ⚠️" if disadvantage else ""}

Используйте кнопку "Бросить кости" и укажите: **d20+модификатор**"""

        # Подготавливаем данные для сохранения
        check_data = {
            "roll_type": roll_type,
            "ability_or_skill": ability_or_skill,
            "dc": dc,
            "advantage": advantage,
            "disadvantage": disadvantage,
            "original_action": original_action
        }

        # Отправляем запрос броска
        roll_request = WebSocketMessage("roll_request", {
            "message": roll_request_msg,
            "sender_name": "ИИ Мастер",
            "timestamp": datetime.utcnow().isoformat(),
            "roll_type": roll_type,
            "ability_or_skill": ability_or_skill,
            "dc": dc,
            "advantage": advantage,
            "disadvantage": disadvantage,
            "original_action": original_action,
            "requesting_player": player_name,
            "requires_dice_roll": True  # ✅ Важный флаг для фронтенда
        })

        await manager.broadcast_to_game(roll_request.to_json(), game_id)

        # ✅ Сохраняем ожидающую проверку в Redis для последующей обработки
        await store_pending_roll_check(game_id, player_name, check_data, original_action)

        logger.info(f"Dice roll requested for {player_name} in game {game_id}")

    except Exception as e:
        logger.error(f"Error requesting dice roll: {e}")
        # В случае ошибки отправляем обычный ответ ИИ
        await send_fallback_ai_response(game_id, original_action, player_name)


async def handle_dice_roll(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Улучшенная обработка броска костей"""
    notation = data.get("notation", "").strip()
    if not notation:
        return

    try:
        # ✅ ИСПРАВЛЕНО: Используем правильный метод roll_from_notation
        from app.services.dice_service import dice_service
        dice_result = dice_service.roll_from_notation(notation)

        # ✅ ИСПРАВЛЕНО: Преобразуем DiceResult в dict для JSON
        result_dict = {
            "notation": dice_result.notation,
            "individual_rolls": dice_result.individual_rolls,
            "modifiers": dice_result.modifiers,
            "total": dice_result.total,
            "is_critical": dice_result.is_critical,
            "is_advantage": dice_result.is_advantage,
            "is_disadvantage": dice_result.is_disadvantage,
            "details": str(dice_result)
        }

        # Создаем сообщение о броске
        dice_msg = WebSocketMessage("dice_roll", {
            "notation": notation,
            "result": result_dict,
            "player_id": user_id,
            "player_name": user.username,
            "purpose": data.get("purpose", ""),
            "timestamp": datetime.utcnow().isoformat()
        })

        # Рассылаем всем игрокам
        await manager.broadcast_to_game(dice_msg.to_json(), game_id)

        # ✅ НОВОЕ: Проверяем, есть ли ожидающая проверка для этого игрока
        pending_check = await get_pending_roll_check(game_id, user.username)
        if pending_check:
            logger.info(f"Processing pending dice check for {user.username}")

            # ✅ ИСПРАВЛЕНО: Передаем dict вместо DiceResult
            await process_dice_check_result(game_id, user.username, result_dict, pending_check)

            # Удаляем ожидающую проверку
            await clear_pending_roll_check(game_id, user.username)
        else:
            logger.info(f"No pending check found for {user.username}, this was a regular dice roll")

    except Exception as e:
        logger.error(f"Error rolling dice: {e}", exc_info=True)
        error_msg = WebSocketMessage("error", {"message": f"Failed to roll dice: {str(e)}"})
        await websocket.send_text(error_msg.to_json())


async def process_dice_check_result(game_id: str, player_name: str, roll_result: dict, pending_check: dict):
    """Обработка результата проверки кубиками"""
    try:
        dc = pending_check.get("dc", 15)
        original_action = pending_check.get("original_action", "unknown action")
        roll_type = pending_check.get("roll_type", "skill_check")

        # Получаем общий результат броска
        total_roll = roll_result.get("total", 0)
        success = total_roll >= dc

        # Формируем контекст для ИИ с результатом проверки
        roll_details = {
            "total": total_roll,
            "rolls": roll_result.get("rolls", []),
            "notation": roll_result.get("notation", "d20"),
            "details": roll_result.get("details", "")
        }

        context = {
            "player_name": player_name,
            "original_action": original_action,
            "roll_type": roll_type,
            "current_scene": "Проверка навыка/характеристики"
        }

        # ✅ Используем специальный метод для генерации ответа на бросок
        ai_response = await ai_service.generate_dice_result_response(
            action=original_action,
            roll_result=roll_details,
            dc=dc,
            character_name=player_name,
            game_context=context
        )

        if not ai_response:
            # Генерируем базовый ответ если ИИ не ответил
            if success:
                ai_response = f"🎯 **{player_name}** успешно выполняет действие '{original_action}'! (Бросок: {total_roll}, нужно было: {dc})\n\nЧто вы делаете дальше?"
            else:
                ai_response = f"❌ **{player_name}** терпит неудачу в попытке '{original_action}'. (Бросок: {total_roll}, нужно было: {dc})\n\nКак вы отреагируете на неудачу?"

        # Отправляем результат проверки
        check_result_msg = WebSocketMessage("dice_check_result", {
            "message": ai_response,
            "sender_name": "ИИ Мастер",
            "timestamp": datetime.utcnow().isoformat(),
            "roll_result": total_roll,
            "dc": dc,
            "success": success,
            "original_action": original_action,
            "player_name": player_name,
            "is_dice_check_result": True  # ✅ Флаг для фронтенда
        })

        await manager.broadcast_to_game(check_result_msg.to_json(), game_id)
        logger.info(f"Dice check result processed for {player_name}: {'SUCCESS' if success else 'FAILURE'} ({total_roll} vs DC {dc})")

    except Exception as e:
        logger.error(f"Error processing dice check result: {e}", exc_info=True)


def get_roll_type_description(roll_type: str) -> str:
    """Получить описание типа броска"""
    descriptions = {
        "проверка_навыка": "Проверка навыка",
        "проверка_характеристики": "Проверка характеристики",
        "атака": "Бросок атаки",
        "спасбросок": "Спасительный бросок",
        "skill_check": "Проверка навыка",
        "ability_check": "Проверка характеристики",
        "attack": "Бросок атаки",
        "saving_throw": "Спасительный бросок"
    }
    return descriptions.get(roll_type, "Проверка")

def get_ability_description(ability: str) -> str:
    """Получить описание характеристики/навыка"""
    descriptions = {
        "атлетика": "Атлетика (Сила)",
        "восприятие": "Восприятие (Мудрость)",
        "расследование": "Расследование (Интеллект)",
        "скрытность": "Скрытность (Ловкость)",
        "убеждение": "Убеждение (Харизма)",
        "обман": "Обман (Харизма)",
        "проницательность": "Проницательность (Мудрость)",
        "ловкость": "Ловкость",
        "сила": "Сила",
        "телосложение": "Телосложение",
        "интеллект": "Интеллект",
        "мудрость": "Мудрость",
        "харизма": "Харизма",
        # Английские варианты
        "athletics": "Атлетика (Сила)",
        "perception": "Восприятие (Мудрость)",
        "investigation": "Расследование (Интеллект)",
        "stealth": "Скрытность (Ловкость)",
        "persuasion": "Убеждение (Харизма)",
        "deception": "Обман (Харизма)",
        "insight": "Проницательность (Мудрость)",
        "dexterity": "Ловкость",
        "strength": "Сила",
        "constitution": "Телосложение",
        "intelligence": "Интеллект",
        "wisdom": "Мудрость",
        "charisma": "Харизма"
    }
    return descriptions.get(ability.lower(), ability.title())


# Функции для работы с Redis (хранение ожидающих проверок)
async def store_pending_roll_check(game_id: str, player_name: str, check_data: dict, original_action: str):
    """Сохранить ожидающую проверку в Redis"""
    try:
        key = f"pending_roll:{game_id}:{player_name}"
        data = {
            **check_data,
            "original_action": original_action,
            "timestamp": datetime.utcnow().isoformat()
        }
        await redis_client.set_with_expiry(key, data, 300)  # 5 минут
        logger.info(f"Stored pending roll check for {player_name} in game {game_id}")
    except Exception as e:
        logger.error(f"Error storing pending roll check: {e}")


async def get_pending_roll_check(game_id: str, player_name: str) -> dict:
    """Получить ожидающую проверку из Redis"""
    try:
        key = f"pending_roll:{game_id}:{player_name}"
        result = await redis_client.get_json(key)
        logger.info(f"Retrieved pending roll check for {player_name}: {result is not None}")
        return result
    except Exception as e:
        logger.error(f"Error getting pending roll check: {e}")
        return None


async def clear_pending_roll_check(game_id: str, player_name: str):
    """Удалить ожидающую проверку из Redis"""
    try:
        key = f"pending_roll:{game_id}:{player_name}"
        await redis_client.delete(key)
        logger.info(f"Cleared pending roll check for {player_name}")
    except Exception as e:
        logger.error(f"Error clearing pending roll check: {e}")


async def send_fallback_ai_response(game_id: str, player_action: str, player_name: str):
    """Отправить резервный ответ ИИ"""
    fallback_response = f"🤖 *ИИ Мастер временно недоступен. {player_name}, продолжайте игру! Что делаете дальше?*"

    fallback_msg = WebSocketMessage("ai_response", {
        "message": fallback_response,
        "sender_name": "ИИ Мастер (оффлайн)",
        "timestamp": datetime.utcnow().isoformat(),
        "in_response_to": player_action,
        "is_fallback": True
    })

    try:
        await manager.broadcast_to_game(fallback_msg.to_json(), game_id)
        logger.info(f"Sent fallback AI response for {player_name}")
    except Exception as e:
        logger.error(f"Failed to send fallback AI response: {e}")

async def handle_dice_roll(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Обработка броска костей"""
    notation = data.get("notation", "").strip()
    if not notation:
        return

    try:
        # Выполняем бросок
        result = dice_service.roll_from_notation(notation)

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
async def handle_request_game_state(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Отправка текущего состояния игры"""
    try:
        # Получаем игру из базы данных
        from app.models.game import Game
        from sqlalchemy import select

        game_query = select(Game).where(Game.id == game_id)
        result = await db.execute(game_query)
        game = result.scalar_one_or_none()

        if not game:
            error_msg = WebSocketMessage("error", {"message": "Game not found"})
            await websocket.send_text(error_msg.to_json())
            return

        # Отправляем состояние игры
        game_state_msg = WebSocketMessage("game_state_update", {
            "game_id": str(game.id),
            "game_name": game.name,
            "current_scene": {
                "description": game.current_scene or "Мастер готовит новое приключение для вашей партии. Скоро начнется увлекательное путешествие! Ваша группа собралась в уютной таверне, обсуждая предстоящие дела.",
                "location": "Таверна 'Дракон и Дева'",
                "weather": "Прохладный вечер",
                "time_of_day": "Вечер",
                "atmosphere": "В таверне слышен смех и звон кружек. Камин потрескивает, создавая уютную атмосферу. Бардец в углу наигрывает веселую мелодию."
            },
            "players_online": manager.get_game_players(game_id),
            "timestamp": datetime.utcnow().isoformat()
        })

        await websocket.send_text(game_state_msg.to_json())

        # Также отправляем историю сообщений
        await handle_request_message_history(websocket, game_id, user_id, user, {"limit": 20}, db)

    except Exception as e:
        logger.error(f"Error sending game state: {e}")
        error_msg = WebSocketMessage("error", {"message": "Failed to get game state"})
        await websocket.send_text(error_msg.to_json())


async def handle_request_message_history(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Отправка истории сообщений"""
    try:
        limit = data.get("limit", 50)

        # Получаем историю из Redis или создаем тестовые сообщения
        try:
            messages = await redis_client.get_game_messages(game_id, limit)
        except:
            messages = []

        if not messages:
            # Создаем начальное сообщение от ИИ мастера
            messages = [{
                "id": "initial-dm-message",
                "type": "ai_dm",
                "content": "🎲 Добро пожаловать в мир приключений! Ваша партия собралась в уютной таверне 'Дракон и Дева'. За окном начинает темнеть, а в камине весело потрескивают дрова. Трактирщик подает вам кружки эля и спрашивает о ваших планах. Что вы хотите делать?",
                "sender_name": "ИИ Мастер",
                "timestamp": datetime.utcnow().isoformat()
            }]

        history_msg = WebSocketMessage("message_history", {
            "messages": messages,
            "total_count": len(messages),
            "timestamp": datetime.utcnow().isoformat()
        })

        await websocket.send_text(history_msg.to_json())

    except Exception as e:
        logger.error(f"Error sending message history: {e}")
        error_msg = WebSocketMessage("error", {"message": "Failed to get message history"})
        await websocket.send_text(error_msg.to_json())


async def handle_request_scene_info(websocket: WebSocket, game_id: str, user_id: str, user: User, data: Dict[str, Any], db: AsyncSession):
    """Отправка информации о текущей сцене"""
    try:
        # Получаем игру из базы данных
        from app.models.game import Game
        from sqlalchemy import select

        game_query = select(Game).where(Game.id == game_id)
        result = await db.execute(game_query)
        game = result.scalar_one_or_none()

        if not game:
            error_msg = WebSocketMessage("error", {"message": "Game not found"})
            await websocket.send_text(error_msg.to_json())
            return

        scene_msg = WebSocketMessage("scene_update", {
            "description": game.current_scene or "Мастер готовит новое приключение для вашей партии. Скоро начнется увлекательное путешествие! Ваша группа собралась в уютной таверне, планируя предстоящие дела и наслаждаясь теплой атмосферой.",
            "location": "Таверна 'Дракон и Дева'",
            "weather": "Прохладный вечер",
            "time_of_day": "Вечер",
            "atmosphere": "В таверне слышен смех и звон кружек. Камин потрескивает, создавая уютную атмосферу. Свечи на столах мерцают, освещая лица собравшихся искателей приключений.",
            "timestamp": datetime.utcnow().isoformat()
        })

        await websocket.send_text(scene_msg.to_json())

    except Exception as e:
        logger.error(f"Error sending scene info: {e}")
        error_msg = WebSocketMessage("error", {"message": "Failed to get scene info"})
        await websocket.send_text(error_msg.to_json())


# Также обновите функцию send_initial_data, которая вызывается при подключении:
async def send_initial_data(websocket: WebSocket, game_id: str, user_id: str, user: User, db: AsyncSession):
    """Отправка начальных данных при подключении к игре"""
    try:
        # Отправляем приветственное сообщение о подключении
        welcome_msg = WebSocketMessage("connected", {
            "game_id": game_id,
            "game_name": "Игровая сессия",
            "user_id": user_id,
            "username": user.username,
            "players_online": manager.get_game_players(game_id),
            "message": f"{user.username} присоединился к игре!",
            "timestamp": datetime.utcnow().isoformat()
        })

        await websocket.send_text(welcome_msg.to_json())

        # Автоматически отправляем текущее состояние игры
        await handle_request_game_state(websocket, game_id, user_id, user, {}, db)

    except Exception as e:
        logger.error(f"Error sending initial data: {e}")
        error_msg = WebSocketMessage("error", {"message": "Failed to send initial data"})
        await websocket.send_text(error_msg.to_json())