# backend/app/api/games.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.core.database import get_db_session
from app.models.game import Game, GameStatus
from app.models.campaign import Campaign
from app.models.user import User
from app.api.auth import get_current_user
from app.services.ai_service import ai_service
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()


# ✅ ИСПРАВЛЕННЫЕ PYDANTIC МОДЕЛИ
class GameCreate(BaseModel):
    campaign_id: str
    name: str
    description: Optional[str] = None
    max_players: int = 6


class GameUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    current_scene: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class JoinGameData(BaseModel):
    character_id: Optional[str] = None


# ✅ ИСПРАВЛЕННАЯ МОДЕЛЬ GameResponse - соответствует get_game_info()
class GameResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    current_players: int
    max_players: int
    current_scene: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ✅ НОВАЯ МОДЕЛЬ для детального просмотра игры
class GameDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    campaign_id: str
    players: Dict[str, Any]
    characters: List[str]
    current_scene: Optional[str]
    turn_info: Dict[str, Any]
    settings: Dict[str, Any]
    world_state: Dict[str, Any]
    statistics: Dict[str, Any]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class AiResponseRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class AiResponseData(BaseModel):
    response: str
    context_used: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None


@router.post("/", response_model=GameResponse)
async def create_game(
        game_data: GameCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Создать новую игру"""
    try:
        # Проверяем существование кампании и права доступа
        campaign_query = select(Campaign).where(Campaign.id == game_data.campaign_id)
        result = await db.execute(campaign_query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        # Проверяем права (создатель кампании или участник может создавать игры)
        user_id = str(current_user.id)
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator or participants can create games"
            )

        # Создаем игру
        game = Game(
            campaign_id=campaign.id,
            name=game_data.name,
            description=game_data.description,
            max_players=game_data.max_players,
            status=GameStatus.WAITING,
            current_players=0,  # ✅ Явно устанавливаем 0
            players=[],         # ✅ Пустой список
            characters=[]       # ✅ Пустой список
        )

        db.add(game)
        await db.commit()
        await db.refresh(game)

        logger.info(f"Game created: {game.name} by {current_user.username}")

        # ✅ Используем исправленный метод
        game_info = game.get_game_info()
        return GameResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create game"
        )


@router.get("/", response_model=List[GameResponse])
async def get_games(
        status_filter: Optional[str] = None,
        campaign_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        current_user: User = Depends(get_current_user),  # ✅ Добавили аутентификацию
        db: AsyncSession = Depends(get_db_session)
):
    """Получить список игр"""
    try:
        query = select(Game)

        # Фильтры
        if status_filter:
            try:
                status_enum = GameStatus(status_filter)
                query = query.where(Game.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}"
                )

        if campaign_id:
            query = query.where(Game.campaign_id == campaign_id)

        query = query.offset(offset).limit(limit).order_by(Game.created_at.desc())

        result = await db.execute(query)
        games = result.scalars().all()

        # ✅ ИСПРАВЛЕННОЕ СОЗДАНИЕ ОТВЕТА
        response_data = []
        for game in games:
            try:
                game_info = game.get_game_info()
                response_data.append(GameResponse(**game_info))
            except Exception as e:
                logger.error(f"Error processing game {game.id}: {e}")
                # Создаем fallback данные если что-то пошло не так
                fallback_data = {
                    "id": str(game.id),
                    "name": game.name or "Unnamed Game",
                    "description": game.description,
                    "status": game.status.value if game.status else "waiting",
                    "current_players": getattr(game, 'current_players', 0),
                    "max_players": getattr(game, 'max_players', 6),
                    "current_scene": getattr(game, 'current_scene', None),
                    "created_at": game.created_at.isoformat() if game.created_at else "",
                }
                response_data.append(GameResponse(**fallback_data))

        logger.info(f"Returned {len(response_data)} games for user {current_user.username}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting games: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get games"
        )


@router.get("/{game_id}", response_model=GameDetailResponse)
async def get_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить детальную информацию об игре"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права доступа (участник игры или создатель кампании)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        user_id = str(current_user.id)
        is_player = user_id in (game.players or [])
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_player or is_creator or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # ✅ Используем подробный метод
        game_info = game.get_detailed_game_info()
        return GameDetailResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get game"
        )


@router.put("/{game_id}", response_model=GameDetailResponse)
async def update_game(
        game_id: str,
        update_data: GameUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Обновить игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права (только создатель кампании может обновлять игру)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can update game"
            )

        # Обновляем игру
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(game, field):
                setattr(game, field, value)

        await db.commit()
        await db.refresh(game)

        logger.info(f"Game updated: {game.name} by {current_user.username}")

        game_info = game.get_detailed_game_info()
        return GameDetailResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update game"
        )


@router.post("/{game_id}/join")
async def join_game(
        game_id: str,
        join_data: JoinGameData = JoinGameData(),
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Присоединиться к игре"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем можно ли присоединиться
        if not game.can_join():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join game: game is full or not accepting players"
            )

        user_id = str(current_user.id)

        # Проверяем что пользователь участник кампании
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign participants can join the game"
            )

        # Добавляем игрока
        if game.add_player(user_id, join_data.character_id):
            await db.commit()
            logger.info(f"User {current_user.username} joined game {game.name}")
            return {"message": "Successfully joined game"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already in game or game is full"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join game"
        )


@router.post("/{game_id}/leave")
async def leave_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Покинуть игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        if game.remove_player(user_id):
            await db.commit()
            logger.info(f"User {current_user.username} left game {game.name}")
            return {"message": "Successfully left game"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not in this game"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave game"
        )


@router.post("/{game_id}/start")
async def start_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Начать игровую сессию"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права (только создатель кампании может начать игру)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can start the game"
            )

        if game.start_game():
            await db.commit()
            logger.info(f"Game started: {game.name} by {current_user.username}")
            return {"message": "Game started successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start game: no players or game not in waiting status"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start game"
        )


@router.post("/{game_id}/pause")
async def pause_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Приостановить игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can pause the game"
            )

        if game.pause_game():
            await db.commit()
            logger.info(f"Game paused: {game.name} by {current_user.username}")
            return {"message": "Game paused successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot pause game: game not active"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause game"
        )


@router.post("/{game_id}/end")
async def end_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Завершить игру"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can end the game"
            )

        if game.end_game():
            await db.commit()
            logger.info(f"Game ended: {game.name} by {current_user.username}")
            return {"message": "Game ended successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot end game: game not active or paused"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end game"
        )


# ✅ ДОПОЛНИТЕЛЬНЫЕ ENDPOINTS ДЛЯ УПРАВЛЕНИЯ ИГРОЙ

@router.get("/{game_id}/players")
async def get_game_players(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить список игроков в игре"""
    try:
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права доступа
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        user_id = str(current_user.id)
        is_player = user_id in (game.players or [])
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_player or is_creator or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return {
            "game_id": str(game.id),
            "players": game.players or [],
            "characters": game.characters or [],
            "current_players": game.current_players,
            "max_players": game.max_players
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game players {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get game players"
        )


@router.post("/{game_id}/messages")
async def send_game_message(
        game_id: str,
        message_data: dict,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Отправить сообщение в игровой чат"""
    try:
        # Проверяем существование игры и права доступа
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)
        if user_id not in (game.players or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only game players can send messages"
            )

        # Здесь можно добавить логику сохранения сообщения в Redis или БД
        # Пока возвращаем подтверждение
        return {
            "message": "Message sent successfully",
            "game_id": game_id,
            "sender": current_user.username,
            "content": message_data.get("content", "")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending game message {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/{game_id}/messages")
async def get_game_messages(
        game_id: str,
        limit: int = 50,
        offset: int = 0,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить сообщения игрового чата"""
    try:
        # Проверяем существование игры и права доступа
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)
        if user_id not in (game.players or []):
            # Проверяем права кампании
            campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
            campaign_result = await db.execute(campaign_query)
            campaign = campaign_result.scalar_one()

            if str(campaign.creator_id) != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

        # Здесь можно добавить логику получения сообщений из Redis или БД
        # Пока возвращаем пустой список
        return {
            "game_id": game_id,
            "messages": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game messages {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get messages"
        )

@router.post("/{game_id}/ai-response", response_model=AiResponseData)
async def get_ai_response(
        game_id: str,
        request_data: AiResponseRequest,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить ответ от ИИ-мастера"""
    try:
        # Проверяем существование игры и права доступа
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права доступа
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        user_id = str(current_user.id)
        is_player = user_id in (game.players or [])
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_player or is_creator or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Получаем ответ от ИИ
        try:
            # Подготавливаем контекст для ИИ
            context = request_data.context or {}
            context.update({
                "game_name": game.name,
                "current_scene": game.current_scene,
                "player_message": request_data.message,
                "player_name": current_user.username
            })

            # Отправляем запрос к ИИ сервису
            ai_response = await ai_service.generate_dm_response(
                game_id=game_id,
                player_action=request_data.message,
                game_context=context,
                character_sheets=[],
                recent_messages=[]
            )

            # Отправляем ответ ИИ через WebSocket всем игрокам в игре
            try:
                from app.api.websocket import manager, WebSocketMessage
                ai_msg = WebSocketMessage("ai_response", {
                    "message": ai_response,
                    "sender_name": "ИИ Мастер",
                    "timestamp": datetime.utcnow().isoformat(),
                    "in_response_to": request_data.message
                })
                await manager.broadcast_to_game(ai_msg.to_json(), game_id)
            except Exception as ws_error:
                logger.warning(f"Failed to broadcast AI response via WebSocket: {ws_error}")

            return AiResponseData(
                response=ai_response,
                context_used=context,
                suggestions=[]  # Можно добавить логику для предложений
            )

        except Exception as ai_error:
            logger.error(f"AI service error: {ai_error}")
            # Возвращаем дефолтный ответ если ИИ недоступен
            default_response = "ИИ Мастер временно недоступен. Попробуйте позже или продолжите игру без ИИ."

            return AiResponseData(
                response=default_response,
                context_used=context,
                suggestions=["Исследовать окрестности", "Поговорить с местными жителями", "Проверить инвентарь"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI response for game {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get AI response"
        )


@router.post("/{game_id}/roll")
async def roll_dice(
        game_id: str,
        roll_data: dict,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Бросить кости в игре"""
    try:
        # Проверяем существование игры и права доступа
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)
        if user_id not in (game.players or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only game players can roll dice"
            )

        # Простая логика броска костей (можно расширить)
        import random

        notation = roll_data.get("notation", "1d20")
        purpose = roll_data.get("purpose", "")

        # Парсим нотацию (упрощенно)
        if "d" in notation:
            parts = notation.split("d")
            num_dice = int(parts[0]) if parts[0] else 1
            die_size = int(parts[1])

            rolls = [random.randint(1, die_size) for _ in range(num_dice)]
            total = sum(rolls)

            # Обновляем счетчик бросков
            game.dice_rolls_count += 1
            await db.commit()

            return {
                "notation": notation,
                "purpose": purpose,
                "rolls": rolls,
                "total": total,
                "player": current_user.username,
                "timestamp": "now"  # В реальности использовать datetime
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid dice notation"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling dice in game {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to roll dice"
        )
