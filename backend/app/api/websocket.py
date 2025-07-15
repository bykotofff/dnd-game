# backend/app/api/websocket.py

import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db_session
from app.models.game import Game
from app.models.user import User
from app.models.character import Character
from app.models.campaign import Campaign
from app.services.ai_service import ai_service
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Менеджер WebSocket соединений"""

    def __init__(self):
        # game_id -> {user_id -> websocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # user_id -> game_id для быстрого поиска
        self.user_to_game: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, game_id: str, user_id: str):
        """Подключить пользователя к игре"""
        await websocket.accept()

        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}

        # Отключаем предыдущее соединение если есть
        if user_id in self.user_to_game:
            old_game_id = self.user_to_game[user_id]
            await self.disconnect(old_game_id, user_id)

        self.active_connections[game_id][user_id] = websocket
        self.user_to_game[user_id] = game_id

        logger.info(f"User {user_id} connected to game {game_id}")

    async def disconnect(self, game_id: str, user_id: str):
        """Отключить пользователя от игры"""
        try:
            if game_id in self.active_connections and user_id in self.active_connections[game_id]:
                del self.active_connections[game_id][user_id]

                # Удаляем пустые игры
                if not self.active_connections[game_id]:
                    del self.active_connections[game_id]

            if user_id in self.user_to_game:
                del self.user_to_game[user_id]

            logger.info(f"User {user_id} disconnected from game {game_id}")
        except Exception as e:
            logger.error(f"Error disconnecting user {user_id} from game {game_id}: {e}")

    async def send_personal_message(self, message: str, game_id: str, user_id: str):
        """Отправить личное сообщение пользователю"""
        try:
            if game_id in self.active_connections and user_id in self.active_connections[game_id]:
                websocket = self.active_connections[game_id][user_id]
                await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message to {user_id}: {e}")
            # Удаляем проблемное соединение
            await self.disconnect(game_id, user_id)

    async def broadcast_to_game(self, message: str, game_id: str, exclude_user: str = None):
        """Отправить сообщение всем в игре"""
        if game_id not in self.active_connections:
            return

        disconnected_users = []

        for user_id, websocket in self.active_connections[game_id].items():
            if exclude_user and user_id == exclude_user:
                continue

            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
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
            logger.warning(f"Game {game_id} not found for user {user.id}")
            await websocket.close(code=1008, reason="Game not found")
            return

        # Проверка доступа
        user_id_str = str(user.id)
        players_list = game.players or []

        # Получаем информацию о кампании для проверки создателя
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

        # Автоматически добавляем игрока в игру если его там нет
        if not is_player and (is_creator or is_participant):
            if user_id_str not in players_list:
                players_list.append(user_id_str)
                game.players = players_list
                game.current_players += 1
                await db.commit()
                logger.info(f"Auto-added user {user.username} to game {game_id}")

        # Получаем информацию о персонаже игрока
        character_info = await get_player_character_info(game, user_id_str, db)
        character_name = character_info.get('name', user.username) if character_info else user.username

        # Принимаем WebSocket соединение
        await manager.connect(websocket, game_id, user_id_str)

        # Отправляем приветственное сообщение с именем персонажа
        welcome_message = WebSocketMessage("system", {
            "message": f"🎭 {character_name} присоединился к игре!",
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

        return {
            "game_id": str(game.id),
            "game_name": game.name,
            "status": game.status.value,
            "current_scene": game.current_scene,
            "players": players_info,
            "your_character": character_info,
            "turn_info": {
                "current_turn": game.current_turn,
                "current_player_index": game.current_player_index,
                "current_player_id": game.get_current_player(),
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

        # Отправляем всем игрокам в игре
        await manager.broadcast_to_game(chat_message.to_json(), game_id)

        logger.info(f"Chat message from {character_name} ({user.username}) in game {game_id}")

    except Exception as e:
        logger.error(f"Error handling chat message: {e}")


async def handle_player_action(websocket: WebSocket, game_id: str, user_id: str, user: User, character_name: str, character_info: Optional[Dict], data: Dict[str, Any], db: AsyncSession):
    """Обработка действий игрока с учетом персонажа"""
    try:
        action = data.get("action", "").strip()
        if not action:
            return

        # Отправляем сообщение о действии с именем персонажа
        action_message = WebSocketMessage("player_action", {
            "action": action,
            "player_id": user_id,
            "player_name": character_name,  # Используем имя персонажа
            "character_info": character_info,
            "timestamp": datetime.utcnow().isoformat()
        })

        await manager.broadcast_to_game(action_message.to_json(), game_id)

        # Запускаем обработку ИИ с данными персонажа
        try:
            query = select(Game).where(Game.id == game_id)
            result = await db.execute(query)
            game = result.scalar_one_or_none()

            if game:
                # Формируем контекст с информацией о персонаже
                context = {
                    "game_name": game.name,
                    "current_scene": game.current_scene,
                    "player_action": action,
                    "player_name": character_name,  # Используем имя персонажа
                    "player_username": user.username,
                    "character_info": character_info,
                    "game_id": game_id
                }

                # Используем улучшенный анализ с данными персонажа
                asyncio.create_task(handle_ai_response_with_character(
                    game_id, action, context, character_name, character_info, user_id
                ))

        except Exception as ai_error:
            logger.warning(f"Failed to trigger AI response: {ai_error}")

    except Exception as e:
        logger.error(f"Error handling player action: {e}")


async def handle_ai_response_with_character(game_id: str, player_action: str, context: Dict, character_name: str, character_info: Optional[Dict], user_id: str):
    """Улучшенная обработка ответа ИИ с учетом данных персонажа"""
    try:
        logger.info(f"Starting AI response with character data for {character_name}")

        # Проверяем health AI сервиса
        ai_health = await ai_service.health_check()
        if not ai_health:
            logger.warning("AI service is not available")
            await send_fallback_ai_response(game_id, player_action, character_name)
            return

        # Используем новый метод с полными данными персонажа
        if character_info:
            dice_analysis = await ai_service.analyze_player_action_with_character(
                action=player_action,
                character_data=character_info,
                game_context=context,
                party_data=[]  # Можно добавить данные о партии
            )
        else:
            # Fallback к старому методу если нет данных о персонаже
            dice_analysis = await ai_service.analyze_player_action(
                action=player_action,
                character_data={"name": character_name, "class": "Fighter"},
                current_situation=context.get('current_scene', 'Unknown situation')
            )

        logger.info(f"Dice analysis result for {character_name}: {dice_analysis}")

        # Если нужна проверка, запрашиваем бросок
        if dice_analysis.get("requires_roll", False):
            await request_dice_roll_with_character(game_id, dice_analysis, character_name, character_info, player_action)
            return

        # Если проверка не нужна, генерируем ответ ИИ с учетом персонажа
        if character_info:
            ai_response = await ai_service.generate_character_aware_response(
                player_action=player_action,
                character_data=character_info,
                game_context=context,
                party_data=[],
                recent_messages=[]
            )
        else:
            # Fallback к старому методу
            ai_response = await ai_service.generate_dm_response(
                game_id=game_id,
                player_action=player_action,
                game_context=context,
                character_sheets=[character_info] if character_info else [],
                recent_messages=[]
            )

        if not ai_response:
            ai_response = f"🤖 *ИИ Мастер задумался над действием {character_name}. Попробуйте описать свои намерения более подробно!*"

        # Отправляем ответ ИИ
        ai_msg = WebSocketMessage("ai_response", {
            "message": ai_response,
            "sender_name": "ИИ Мастер",
            "timestamp": datetime.utcnow().isoformat(),
            "in_response_to": player_action,
            "responding_to_player": character_name  # Используем имя персонажа
        })

        await manager.broadcast_to_game(ai_msg.to_json(), game_id)
        logger.info(f"AI response sent for action by {character_name}")

    except Exception as e:
        logger.error(f"Error in AI response with character: {e}", exc_info=True)
        await send_fallback_ai_response(game_id, player_action, character_name)


async def request_dice_roll_with_character(game_id: str, dice_analysis: Dict, character_name: str, character_info: Optional[Dict], original_action: str):
    """Запрос броска кубиков с учетом данных персонажа"""
    try:
        roll_type = dice_analysis.get("roll_type", "проверка_навыка")
        ability_or_skill = dice_analysis.get("ability_or_skill", "восприятие")
        dc = int(dice_analysis.get("suggested_dc", 15))
        advantage_disadvantage = dice_analysis.get("advantage_disadvantage", "обычно")

        # Вычисляем модификатор с учетом данных персонажа
        modifier = 0
        if character_info:
            modifier = ai_service._calculate_modifier(character_info, ability_or_skill)

        # Сохраняем информацию о проверке
        await save_pending_roll_check(game_id, character_name, {
            "roll_type": roll_type,
            "ability_or_skill": ability_or_skill,
            "dc": dc,
            "modifier": modifier,
            "advantage_disadvantage": advantage_disadvantage,
            "original_action": original_action,
            "character_info": character_info
        })

        # Отправляем запрос на бросок
        skill_display = ability_or_skill.title()
        modifier_text = f"+{modifier}" if modifier > 0 else str(modifier) if modifier < 0 else ""

        roll_request_msg = WebSocketMessage("dice_roll_request", {
            "message": f"🎲 **{character_name}** должен выполнить проверку: **{skill_display}**\n\n"
                       f"Бросьте d20{modifier_text} (Сложность: {dc})\n"
                       f"Действие: *{original_action}*",
            "player_name": character_name,
            "roll_type": roll_type,
            "skill": ability_or_skill,
            "dc": dc,
            "modifier": modifier,
            "advantage": advantage_disadvantage == "преимущество",
            "disadvantage": advantage_disadvantage == "помеха",
            "timestamp": datetime.utcnow().isoformat()
        })

        await manager.broadcast_to_game(roll_request_msg.to_json(), game_id)
        logger.info(f"Dice roll requested for {character_name}: {skill_display} DC{dc}")

    except Exception as e:
        logger.error(f"Error requesting dice roll: {e}")


async def handle_dice_roll(websocket: WebSocket, game_id: str, user_id: str, user: User, character_name: str, data: Dict[str, Any], db: AsyncSession):
    """Улучшенная обработка броска костей с автоматическими модификаторами"""
    notation = data.get("notation", "").strip()
    if not notation:
        return

    try:
        from app.services.dice_service import dice_service

        # Проверяем, есть ли ожидающая проверка для добавления модификатора
        pending_check = await get_pending_roll_check(game_id, character_name)

        if pending_check and notation == "1d20":
            # Для проверок навыков бросаем только d20, модификатор добавим потом
            dice_result = dice_service.roll_from_notation("1d20")
        else:
            # Для обычных бросков используем полную нотацию
            dice_result = dice_service.roll_from_notation(notation)

        # Преобразуем DiceResult в dict для JSON
        result_dict = {
            "notation": notation,
            "individual_rolls": dice_result.individual_rolls,
            "modifiers": dice_result.modifiers,
            "total": dice_result.total,  # Для проверок это будет только d20
            "is_critical": dice_result.is_critical,
            "is_fumble": dice_result.is_fumble,
            "player_name": character_name,  # Используем имя персонажа
            "timestamp": datetime.utcnow().isoformat()
        }

        # Отправляем результат броска
        dice_message = WebSocketMessage("dice_roll", result_dict)
        await manager.broadcast_to_game(dice_message.to_json(), game_id)

        # Если это проверка навыка, обрабатываем результат
        if pending_check:
            await process_dice_check_result(game_id, character_name, result_dict, pending_check)
            # Удаляем обработанную проверку
            await clear_pending_roll_check(game_id, character_name)

        logger.info(f"Dice roll by {character_name}: {notation} = {dice_result.total}")

    except Exception as e:
        logger.error(f"Error handling dice roll: {e}")
        error_msg = WebSocketMessage("error", {
            "message": f"Ошибка при броске {notation}: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        })
        await websocket.send_text(error_msg.to_json())


async def process_dice_check_result(game_id: str, character_name: str, roll_result: Dict, pending_check: Dict):
    """Обработка результата проверки кубиками (улучшенная версия)"""
    try:
        dc = pending_check.get("dc", 15)
        original_action = pending_check.get("original_action", "unknown action")
        roll_type = pending_check.get("roll_type", "skill_check")
        skill_display = pending_check.get("ability_or_skill", "навык").title()
        modifier = pending_check.get("modifier", 0)
        character_info = pending_check.get("character_info")

        # Получаем базовый результат броска (без модификатора)
        base_roll = roll_result.get("total", 0)

        # Автоматически добавляем модификатор
        final_total = base_roll + modifier
        success = final_total >= dc

        # Формируем контекст для ИИ
        context = {
            "player_name": character_name,
            "original_action": original_action,
            "roll_type": roll_type,
            "skill_display": skill_display,
            "base_roll": base_roll,
            "modifier": modifier,
            "final_total": final_total,
            "dc": dc,
            "success": success,
            "current_scene": "Проверка навыка/характеристики"
        }

        # Используем специальный метод для генерации ответа на бросок
        ai_response = await ai_service.generate_dice_result_response(
            action=original_action,
            roll_result={
                "base_roll": base_roll,
                "modifier": modifier,
                "total": final_total,
                "success": success,
                "skill": skill_display
            },
            dc=dc,
            character_name=character_name,
            game_context=context
        )

        if not ai_response:
            # Генерируем базовый ответ если ИИ не ответил
            modifier_text = f"+{modifier}" if modifier > 0 else str(modifier) if modifier < 0 else ""
            roll_text = f"[{base_roll}{modifier_text} = {final_total}]"

            if success:
                ai_response = f"🎯 **{character_name}** успешно выполняет {original_action}! {roll_text}\n\nЧто вы делаете дальше?"
            else:
                ai_response = f"❌ **{character_name}** терпит неудачу в попытке {original_action}. {roll_text}\n\nКак вы отреагируете на неудачу?"

        # Отправляем результат проверки
        check_result_msg = WebSocketMessage("dice_check_result", {
            "message": ai_response,
            "sender_name": "ИИ Мастер",
            "timestamp": datetime.utcnow().isoformat(),
            "base_roll": base_roll,
            "modifier": modifier,
            "final_total": final_total,
            "dc": dc,
            "success": success,
            "original_action": original_action,
            "player_name": character_name,
            "skill_display": skill_display,
            "is_dice_check_result": True
        })

        await manager.broadcast_to_game(check_result_msg.to_json(), game_id)
        logger.info(f"Dice check result for {character_name}: {skill_display} {base_roll}+{modifier}={final_total} vs DC{dc} = {'SUCCESS' if success else 'FAILURE'}")

    except Exception as e:
        logger.error(f"Error processing dice check result: {e}", exc_info=True)


async def send_fallback_ai_response(game_id: str, player_action: str, character_name: str):
    """Отправить запасной ответ ИИ если основной сервис недоступен"""
    fallback_response = f"🤖 *ИИ Мастер временно недоступен, но игра продолжается!*\n\n" \
                        f"*{character_name} выполняет действие: {player_action}*\n\n" \
                        f"Что вы делаете дальше?"

    fallback_msg = WebSocketMessage("ai_response", {
        "message": fallback_response,
        "sender_name": "ИИ Мастер (оффлайн)",
        "timestamp": datetime.utcnow().isoformat(),
        "in_response_to": player_action,
        "is_fallback": True
    })

    try:
        await manager.broadcast_to_game(fallback_msg.to_json(), game_id)
        logger.info(f"Sent fallback AI response for {character_name}")
    except Exception as e:
        logger.error(f"Failed to send fallback AI response: {e}")


# Функции для работы с ожидающими проверками кубиков
async def save_pending_roll_check(game_id: str, character_name: str, check_data: Dict):
    """Сохранить информацию об ожидающей проверке"""
    try:
        key = f"pending_roll:{game_id}:{character_name}"
        await redis_client.setex(key, 300, json.dumps(check_data))  # 5 минут TTL
        logger.debug(f"Saved pending roll check for {character_name} in game {game_id}")
    except Exception as e:
        logger.error(f"Error saving pending roll check: {e}")


async def get_pending_roll_check(game_id: str, character_name: str) -> Optional[Dict]:
    """Получить информацию об ожидающей проверке"""
    try:
        key = f"pending_roll:{game_id}:{character_name}"
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Error getting pending roll check: {e}")
    return None


async def clear_pending_roll_check(game_id: str, character_name: str):
    """Удалить информацию об ожидающей проверке"""
    try:
        key = f"pending_roll:{game_id}:{character_name}"
        await redis_client.delete(key)
        logger.debug(f"Cleared pending roll check for {character_name} in game {game_id}")
    except Exception as e:
        logger.error(f"Error clearing pending roll check: {e}")


# Утилитарные функции для описаний
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
        "скрытность": "Скрытность (Ловкость)",
        "убеждение": "Убеждение (Харизма)",
        "обман": "Обман (Харизма)",
        "запугивание": "Запугивание (Харизма)",
        "проницательность": "Проницательность (Мудрость)",
        "расследование": "Расследование (Интеллект)",
        "медицина": "Медицина (Мудрость)",
        "природа": "Природа (Интеллект)",
        "религия": "Религия (Интеллект)",
        "магия": "Магия (Интеллект)",
        "история": "История (Интеллект)",
        "выживание": "Выживание (Мудрость)",
        "обращение_с_животными": "Обращение с животными (Мудрость)",
        "акробатика": "Акробатика (Ловкость)",
        "ловкость_рук": "Ловкость рук (Ловкость)",
        "выступление": "Выступление (Харизма)",

        # Основные характеристики
        "сила": "Сила",
        "ловкость": "Ловкость",
        "телосложение": "Телосложение",
        "интеллект": "Интеллект",
        "мудрость": "Мудрость",
        "харизма": "Харизма",

        # English versions
        "athletics": "Атлетика (Сила)",
        "perception": "Восприятие (Мудрость)",
        "stealth": "Скрытность (Ловкость)",
        "persuasion": "Убеждение (Харизма)",
        "deception": "Обман (Харизма)",
        "intimidation": "Запугивание (Харизма)",
        "insight": "Проницательность (Мудрость)",
        "investigation": "Расследование (Интеллект)",
        "medicine": "Медицина (Мудрость)",
        "nature": "Природа (Интеллект)",
        "religion": "Религия (Интеллект)",
        "arcana": "Магия (Интеллект)",
        "history": "История (Интеллект)",
        "survival": "Выживание (Мудрость)",
        "animal_handling": "Обращение с животными (Мудрость)",
        "acrobatics": "Акробатика (Ловкость)",
        "sleight_of_hand": "Ловкость рук (Ловкость)",
        "performance": "Выступление (Харизма)",

        "strength": "Сила",
        "dexterity": "Ловкость",
        "constitution": "Телосложение",
        "intelligence": "Интеллект",
        "wisdom": "Мудрость",
        "charisma": "Харизма"
    }
    return descriptions.get(ability.lower(), ability.title())


def get_skill_modifier(skill: str, character_name: str) -> int:
    """
    Получить модификатор навыка для персонажа
    Временная функция - в реальности должна получать данные из БД
    """
    # Временная заглушка - возвращает случайный модификатор
    # В реальности должна вычислять на основе характеристик персонажа
    import random
    return random.randint(-1, 5)


# Дополнительные WebSocket endpoints для административных функций
@router.websocket("/admin/{game_id}")
async def websocket_admin_endpoint(
        websocket: WebSocket,
        game_id: str,
        token: str = Query(...),
        db: AsyncSession = Depends(get_db_session)
):
    """WebSocket endpoint для администраторов игры (ДМ)"""
    user = None

    try:
        # Аутентификация пользователя
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid token")
            return

        # Проверяем права администратора
        query = select(Game).join(Campaign).where(
            Game.id == game_id,
            Campaign.creator_id == user.id
        )
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            await websocket.close(code=1008, reason="Access denied")
            return

        await websocket.accept()

        # Отправляем административную информацию
        admin_info = {
            "connected_players": manager.get_connected_users(game_id),
            "game_status": game.status.value,
            "total_players": game.current_players,
            "session_duration": game.session_duration
        }

        admin_message = WebSocketMessage("admin_info", admin_info)
        await websocket.send_text(admin_message.to_json())

        # Основной цикл для административных команд
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                command = message_data.get("command")

                if command == "kick_player":
                    player_id = message_data.get("player_id")
                    await handle_kick_player(game_id, player_id, db)
                elif command == "pause_game":
                    await handle_pause_game(game_id, db)
                elif command == "resume_game":
                    await handle_resume_game(game_id, db)
                elif command == "broadcast_message":
                    message = message_data.get("message", "")
                    await handle_dm_broadcast(game_id, message, user.username)
                else:
                    logger.warning(f"Unknown admin command: {command}")

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error handling admin command: {e}")

    except Exception as e:
        logger.error(f"Admin WebSocket error for game {game_id}: {e}")
    finally:
        if user:
            logger.info(f"Admin {user.username} disconnected from game {game_id}")


async def handle_kick_player(game_id: str, player_id: str, db: AsyncSession):
    """Исключить игрока из игры"""
    try:
        # Отключаем WebSocket соединение
        await manager.disconnect(game_id, player_id)

        # Отправляем сообщение об исключении
        kick_message = WebSocketMessage("system", {
            "message": f"Игрок был исключен из игры",
            "kicked_player_id": player_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        await manager.broadcast_to_game(kick_message.to_json(), game_id)

        logger.info(f"Player {player_id} kicked from game {game_id}")
    except Exception as e:
        logger.error(f"Error kicking player: {e}")


async def handle_pause_game(game_id: str, db: AsyncSession):
    """Приостановить игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if game and game.pause_game():
            await db.commit()

            pause_message = WebSocketMessage("system", {
                "message": "🔸 Игра приостановлена Данжеон Мастером",
                "game_status": "paused",
                "timestamp": datetime.utcnow().isoformat()
            })
            await manager.broadcast_to_game(pause_message.to_json(), game_id)

        logger.info(f"Game {game_id} paused")
    except Exception as e:
        logger.error(f"Error pausing game: {e}")


async def handle_resume_game(game_id: str, db: AsyncSession):
    """Возобновить игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if game and game.resume_game():
            await db.commit()

            resume_message = WebSocketMessage("system", {
                "message": "▶️ Игра возобновлена Данжеон Мастером",
                "game_status": "active",
                "timestamp": datetime.utcnow().isoformat()
            })
            await manager.broadcast_to_game(resume_message.to_json(), game_id)

        logger.info(f"Game {game_id} resumed")
    except Exception as e:
        logger.error(f"Error resuming game: {e}")


async def handle_dm_broadcast(game_id: str, message: str, dm_name: str):
    """Отправить сообщение от ДМ всем игрокам"""
    try:
        dm_message = WebSocketMessage("dm_broadcast", {
            "message": f"📢 **Объявление от ДМ ({dm_name}):**\n\n{message}",
            "sender_name": f"ДМ {dm_name}",
            "timestamp": datetime.utcnow().isoformat(),
            "is_dm_message": True
        })
        await manager.broadcast_to_game(dm_message.to_json(), game_id)

        logger.info(f"DM broadcast sent in game {game_id}")
    except Exception as e:
        logger.error(f"Error sending DM broadcast: {e}")


# Экспорт менеджера для использования в других модулях
__all__ = ["manager", "WebSocketMessage"]