# backend/app/api/games.py - ИСПРАВЛЕННАЯ ВЕРСИЯ

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db_session
from app.api.auth import get_current_user
from app.models.game import Game, GameStatus
from app.models.user import User
from app.models.character import Character
from app.models.campaign import Campaign

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic модели
class CreateGameData(BaseModel):
    campaign_id: str
    name: str
    description: Optional[str] = None
    max_players: int = 6


class JoinGameData(BaseModel):
    character_id: Optional[str] = None


class UpdateGameData(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_players: Optional[int] = None
    current_scene: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class GameResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    current_players: int
    max_players: int
    current_scene: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class GameDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    campaign_id: str
    current_players: int
    max_players: int
    players: List[str]
    characters: List[str]
    player_characters: Dict[str, str]
    current_scene: Optional[str]
    turn_info: Dict[str, Any]
    settings: Dict[str, Any]
    world_state: Dict[str, Any]
    session_duration: int
    total_messages: int
    total_dice_rolls: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/test")
async def test_route():
    """Тестовый маршрут для проверки работы API"""
    return {"message": "Games API is working", "timestamp": datetime.now().isoformat()}


@router.get("/", response_model=List[GameResponse])
async def get_games(
        status_filter: Optional[str] = None,
        campaign_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить список игр"""
    try:
        logger.info(f"Getting games for user {current_user.username}, campaign_id: {campaign_id}, status_filter: {status_filter}")

        query = select(Game)

        # Фильтры
        if status_filter:
            try:
                # Нормализуем статус - приводим к верхнему регистру
                status_value = status_filter.upper()
                status_enum = GameStatus(status_value)
                query = query.where(Game.status == status_enum)
                logger.info(f"Applied status filter: {status_value}")
            except ValueError:
                logger.error(f"Invalid status filter: {status_filter}")
                valid_statuses = [s.value for s in GameStatus]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}. Valid values: {valid_statuses}"
                )

        if campaign_id:
            query = query.where(Game.campaign_id == campaign_id)

        query = query.offset(offset).limit(limit).order_by(Game.created_at.desc())

        result = await db.execute(query)
        games = result.scalars().all()

        logger.info(f"Found {len(games)} games")
        logger.info(f"Returning {len(games)} games")

        # Создаем ответ
        response_data = []
        for game in games:
            try:
                game_info = game.get_game_info()
                # Добавляем недостающее поле updated_at
                game_info["updated_at"] = game.updated_at.isoformat() if game.updated_at else ""
                response_data.append(GameResponse(**game_info))
            except Exception as e:
                logger.error(f"Error processing game {game.id}: {e}")
                # Создаем fallback данные с обязательным полем updated_at
                fallback_data = {
                    "id": str(game.id),
                    "name": game.name or "Unnamed Game",
                    "description": game.description,
                    "status": game.status.value if hasattr(game.status, 'value') else str(game.status),
                    "current_players": getattr(game, 'current_players', 0),
                    "max_players": getattr(game, 'max_players', 6),
                    "current_scene": getattr(game, 'current_scene', None),
                    "created_at": game.created_at.isoformat() if game.created_at else "",
                    "updated_at": game.updated_at.isoformat() if game.updated_at else ""
                }
                response_data.append(GameResponse(**fallback_data))

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting games: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get games: {str(e)}"
        )


@router.get("/{game_id}", response_model=GameDetailResponse)
async def get_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить детальную информацию об игре"""
    try:
        logger.info(f"Getting game {game_id} for user {current_user.username}")

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
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
            logger.error(f"User {current_user.username} has no access to game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Получаем детальную информацию
        game_info = game.get_detailed_game_info()
        return GameDetailResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game {game_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get game: {str(e)}"
        )


@router.post("/", response_model=GameResponse)
async def create_game(
        game_data: CreateGameData,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Создать новую игру"""
    try:
        logger.info(f"Creating game for campaign {game_data.campaign_id} by user {current_user.username}")

        # Проверяем существование кампании
        campaign_query = select(Campaign).where(Campaign.id == game_data.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one_or_none()

        if not campaign:
            logger.error(f"Campaign {game_data.campaign_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        # Проверяем права (создатель кампании или участник может создавать игры)
        user_id = str(current_user.id)
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            logger.error(f"User {current_user.username} has no access to campaign {game_data.campaign_id}")
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
            current_players=0,
            players=[],
            characters=[],
            player_characters={},
            current_scene=None,
            turn_info={
                "current_turn": 0,
                "initiative_order": [],
                "round_number": 1
            },
            settings={
                "auto_initiative": True,
                "show_hp": True,
                "allow_private_rolls": True,
                "combat_tracking": True
            },
            world_state={},
            session_duration=0,
            total_messages=0,
            total_dice_rolls=0
        )

        db.add(game)
        await db.commit()
        await db.refresh(game)

        logger.info(f"Game '{game.name}' created successfully with ID {game.id}")

        # Возвращаем базовую информацию об игре
        game_info = game.get_game_info()
        return GameResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating game: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create game: {str(e)}"
        )


@router.post("/{game_id}/join")
async def join_game(
        game_id: str,
        join_data: JoinGameData,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Присоединиться к игре"""
    try:
        logger.info(f"User {current_user.username} joining game {game_id} with character {join_data.character_id}")

        # Проверяем существование игры
        game_query = select(Game).where(Game.id == game_id)
        game_result = await db.execute(game_query)
        game = game_result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права доступа к кампании
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        user_id = str(current_user.id)
        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            logger.error(f"User {current_user.username} has no access to campaign for game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Проверяем, что игра в состоянии ожидания
        if game.status != GameStatus.WAITING:
            logger.error(f"Game {game_id} is not in waiting status")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game is not accepting new players"
            )

        # Проверяем, что игра не полная
        if game.current_players >= game.max_players:
            logger.error(f"Game {game_id} is full")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game is full"
            )

        # Проверяем, что пользователь еще не в игре
        if user_id in (game.players or []):
            logger.error(f"User {current_user.username} already in game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already in this game"
            )

        # Проверяем существование персонажа
        character_query = select(Character).where(
            Character.id == join_data.character_id,
            Character.owner_id == current_user.id
        )
        character_result = await db.execute(character_query)
        character = character_result.scalar_one_or_none()

        if not character:
            logger.error(f"Character {join_data.character_id} not found or not owned by user {current_user.username}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Добавляем игрока в игру
        players = game.players or []
        characters = game.characters or []
        player_characters = game.player_characters or {}

        players.append(user_id)
        characters.append(str(character.id))
        player_characters[user_id] = str(character.id)

        game.players = players
        game.characters = characters
        game.player_characters = player_characters
        game.current_players = len(players)

        await db.commit()

        logger.info(f"User {current_user.username} successfully joined game {game_id}")

        return {"message": "Successfully joined game", "game_id": game_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join game: {str(e)}"
        )


@router.post("/{game_id}/start")
async def start_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Начать игру"""
    try:
        logger.info(f"Starting game {game_id} by user {current_user.username}")

        # Проверяем существование игры
        game_query = select(Game).where(Game.id == game_id)
        game_result = await db.execute(game_query)
        game = game_result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права (только создатель кампании может начать игру)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            logger.error(f"User {current_user.username} cannot start game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can start games"
            )

        # Проверяем состояние игры
        if game.status != GameStatus.WAITING:
            logger.error(f"Game {game_id} is not in waiting status")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game is not in waiting status"
            )

        # Проверяем, что есть игроки
        if not game.players or len(game.players) == 0:
            logger.error(f"Game {game_id} has no players")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start game with no players"
            )

        # Меняем статус игры
        game.status = GameStatus.ACTIVE
        await db.commit()

        logger.info(f"Game {game_id} started successfully")

        return {"message": "Game started successfully", "game_id": game_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start game: {str(e)}"
        )


@router.get("/{game_id}/players")
async def get_game_players(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить список игроков в игре"""
    try:
        logger.info(f"Getting players for game {game_id}")

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
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
            logger.error(f"User {current_user.username} has no access to game {game_id} players")
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
        logger.error(f"Error getting game players {game_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get game players: {str(e)}"
        )


@router.put("/{game_id}")
async def update_game(
        game_id: str,
        update_data: UpdateGameData,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Обновить игру"""
    try:
        logger.info(f"Updating game {game_id} by user {current_user.username}")

        # Проверяем существование игры
        game_query = select(Game).where(Game.id == game_id)
        game_result = await db.execute(game_query)
        game = game_result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права (только создатель кампании может обновлять игру)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            logger.error(f"User {current_user.username} cannot update game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can update games"
            )

        # Обновляем поля
        if update_data.name is not None:
            game.name = update_data.name
        if update_data.description is not None:
            game.description = update_data.description
        if update_data.max_players is not None:
            game.max_players = update_data.max_players
        if update_data.current_scene is not None:
            game.current_scene = update_data.current_scene
        if update_data.settings is not None:
            game.settings = update_data.settings

        await db.commit()

        logger.info(f"Game {game_id} updated successfully")

        # Возвращаем обновленную информацию
        game_info = game.get_detailed_game_info()
        return GameDetailResponse(**game_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update game: {str(e)}"
        )


@router.delete("/{game_id}")
async def delete_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Удалить игру"""
    try:
        logger.info(f"Deleting game {game_id} by user {current_user.username}")

        # Проверяем существование игры
        game_query = select(Game).where(Game.id == game_id)
        game_result = await db.execute(game_query)
        game = game_result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        # Проверяем права (только создатель кампании может удалять игру)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            logger.error(f"User {current_user.username} cannot delete game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can delete games"
            )

        # Удаляем игру
        await db.delete(game)
        await db.commit()

        logger.info(f"Game {game_id} deleted successfully")

        return {"message": "Game deleted successfully", "game_id": game_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete game: {str(e)}"
        )


@router.post("/{game_id}/leave")
async def leave_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Покинуть игру"""
    try:
        logger.info(f"User {current_user.username} leaving game {game_id}")

        # Проверяем существование игры
        game_query = select(Game).where(Game.id == game_id)
        game_result = await db.execute(game_query)
        game = game_result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        # Проверяем, что пользователь в игре
        if user_id not in (game.players or []):
            logger.error(f"User {current_user.username} not in game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not in this game"
            )

        # Удаляем игрока из игры
        players = game.players or []
        characters = game.characters or []
        player_characters = game.player_characters or {}

        # Получаем персонажа пользователя
        character_id = player_characters.get(user_id)

        # Удаляем из всех списков
        if user_id in players:
            players.remove(user_id)
        if character_id and character_id in characters:
            characters.remove(character_id)
        if user_id in player_characters:
            del player_characters[user_id]

        game.players = players
        game.characters = characters
        game.player_characters = player_characters
        game.current_players = len(players)

        await db.commit()

        logger.info(f"User {current_user.username} successfully left game {game_id}")

        return {"message": "Successfully left game", "game_id": game_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave game: {str(e)}"
        )