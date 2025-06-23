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

logger = logging.getLogger(__name__)
router = APIRouter()


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

        # Проверяем права (только создатель кампании может создавать игры)
        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can create games"
            )

        # Создаем игру
        game = Game(
            campaign_id=campaign.id,
            name=game_data.name,
            description=game_data.description,
            max_players=game_data.max_players,
            status=GameStatus.WAITING
        )

        db.add(game)
        await db.commit()
        await db.refresh(game)

        logger.info(f"Game created: {game.name} by {current_user.username}")

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

        return [
            GameResponse(**game.get_game_info())
            for game in games
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting games: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get games"
        )


@router.get("/{game_id}")
async def get_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить информацию об игре"""
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
        is_player = user_id in game.players
        is_creator = str(campaign.creator_id) == user_id

        if not (is_player or is_creator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return game.get_game_info()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game {game_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get game"
        )


@router.put("/{game_id}")
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

        # Проверяем права (только создатель кампании)
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        if str(campaign.creator_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can update games"
            )

        # Обновляем игру
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(game, field):
                setattr(game, field, value)

        await db.commit()
        await db.refresh(game)

        logger.info(f"Game updated: {game.name}")

        return game.get_game_info()

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
        character_id: Optional[str] = None,
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

        if not game.can_join():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join this game"
            )

        user_id = str(current_user.id)

        if not game.add_player(user_id, character_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to join game (already joined or game full)"
            )

        await db.commit()

        logger.info(f"User {current_user.username} joined game {game.name}")

        return {"message": "Successfully joined game", "game": game.get_game_info()}

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

        if not game.remove_player(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not in this game"
            )

        await db.commit()

        logger.info(f"User {current_user.username} left game {game.name}")

        return {"message": "Successfully left game"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving game {game_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave game"
        )