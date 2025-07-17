# backend/app/api/games.py - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

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
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic модели
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


class GameDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    campaign_id: str
    players: List[str]
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


@router.post("/", response_model=GameResponse)
async def create_game(
        game_data: GameCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Создать новую игру"""
    try:
        logger.info(f"Creating game for campaign {game_data.campaign_id} by user {current_user.username}")

        # Проверяем существование кампании и права доступа
        campaign_query = select(Campaign).where(Campaign.id == game_data.campaign_id)
        result = await db.execute(campaign_query)
        campaign = result.scalar_one_or_none()

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
@router.get("/test")
async def test_route():
    """Тестовый маршрут для проверки работы API"""
    return {"message": "Games API is working", "timestamp": datetime.now().isoformat()}


@router.post("/{game_id}/test-join")
async def test_join_route(
        game_id: str,
        current_user: User = Depends(get_current_user)
):
    """Тестовый маршрут для проверки join functionality"""
    return {
        "message": f"Test join for game {game_id}",
        "user": current_user.username,
        "timestamp": datetime.now().isoformat()
    }

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
                status_enum = GameStatus(status_filter)
                query = query.where(Game.status == status_enum)
            except ValueError:
                logger.error(f"Invalid status filter: {status_filter}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}"
                )

        if campaign_id:
            query = query.where(Game.campaign_id == campaign_id)

        query = query.offset(offset).limit(limit).order_by(Game.created_at.desc())

        result = await db.execute(query)
        games = result.scalars().all()

        logger.info(f"Found {len(games)} games")

        # Создаем ответ
        response_data = []
        for game in games:
            try:
                game_info = game.get_game_info()
                response_data.append(GameResponse(**game_info))
            except Exception as e:
                logger.error(f"Error processing game {game.id}: {e}")
                # Создаем fallback данные
                fallback_data = {
                    "id": str(game.id),
                    "name": game.name or "Unnamed Game",
                    "description": game.description,
                    "status": game.status.value if hasattr(game.status, 'value') else str(game.status),
                    "current_players": getattr(game, 'current_players', 0),
                    "max_players": getattr(game, 'max_players', 6),
                    "current_scene": getattr(game, 'current_scene', None),
                    "created_at": game.created_at.isoformat() if game.created_at else "",
                }
                response_data.append(GameResponse(**fallback_data))

        logger.info(f"Returning {len(response_data)} games")
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


router.post("/{game_id}/join")
async def join_game(
        game_id: str,
        join_data: JoinGameData = JoinGameData(),
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Присоединиться к игре с выбранным персонажем"""
    try:
        logger.info(f"User {current_user.username} joining game {game_id} with character {join_data.character_id}")

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        # Проверяем статус игры - должна быть в ожидании или активной
        if game.status not in [GameStatus.WAITING, GameStatus.ACTIVE]:
            logger.error(f"Cannot join game {game_id}: game status is {game.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join game: game is not accepting new players"
            )

        # Проверяем лимит игроков
        if game.current_players >= game.max_players:
            logger.error(f"Cannot join game {game_id}: game is full ({game.current_players}/{game.max_players})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join game: game is full"
            )

        # Проверяем что игрок еще не в игре
        if game.is_player_in_game(user_id):
            logger.info(f"User {current_user.username} is already in game {game_id}")
            return {"message": "Already in game"}

        # Проверяем что пользователь участник кампании
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one()

        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            logger.error(f"User {current_user.username} is not a participant of campaign {game.campaign_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign participants can join the game"
            )

        # Валидация персонажа если указан
        character_id_to_use = None
        if join_data.character_id:
            character_id_to_use = str(join_data.character_id)

            # Проверяем что персонаж существует и принадлежит пользователю
            from app.models.character import Character
            char_query = select(Character).where(
                and_(
                    Character.id == character_id_to_use,
                    Character.owner_id == current_user.id
                )
            )
            char_result = await db.execute(char_query)
            character = char_result.scalar_one_or_none()

            if not character:
                logger.error(f"Character {character_id_to_use} not found or not owned by user {current_user.username}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Character not found or not owned by user"
                )

            # ✅ ИСПРАВЛЕНИЕ: Убираем проверку использования персонажа в других играх
            # Разрешаем использовать одного персонажа в нескольких играх кампании
            # Или делаем проверку менее строгой

            # Опционально: проверяем только активные игры этой же кампании
            same_campaign_games_query = select(Game).where(
                and_(
                    Game.campaign_id == game.campaign_id,
                    Game.status.in_([GameStatus.ACTIVE]),
                    Game.id != game_id
                )
            )
            same_campaign_result = await db.execute(same_campaign_games_query)
            same_campaign_games = same_campaign_result.scalars().all()

            for other_game in same_campaign_games:
                if (other_game.player_characters and
                        user_id in other_game.player_characters and
                        other_game.player_characters[user_id] == character_id_to_use):
                    logger.warning(f"Character {character_id_to_use} is already used by user in another active game of this campaign")
                    # Вместо ошибки, просто предупреждаем и продолжаем
                    break

        # Присоединяем игрока к игре
        if game.add_player(user_id, character_id_to_use):
            await db.commit()
            logger.info(f"User {current_user.username} successfully joined game {game_id}")
            return {"message": "Successfully joined game"}
        else:
            logger.error(f"Failed to add user {current_user.username} to game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to join game"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join game: {str(e)}"
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

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        if game.remove_player(user_id):
            await db.commit()
            logger.info(f"User {current_user.username} successfully left game {game_id}")
            return {"message": "Successfully left game"}
        else:
            logger.error(f"User {current_user.username} is not in game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not in this game"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave game: {str(e)}"
        )

@router.post("/{game_id}/join")
async def join_game(
        game_id: str,
        join_data: JoinGameData = JoinGameData(),
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Присоединиться к игре с выбранным персонажем"""
    try:
        logger.info(f"User {current_user.username} joining game {game_id} with character {join_data.character_id}")

        # Получаем игру
        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        # Проверяем статус игры
        if game.status not in [GameStatus.WAITING, GameStatus.ACTIVE]:
            logger.error(f"Cannot join game {game_id}: game status is {game.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join game: game is not accepting new players"
            )

        # Проверяем лимит игроков
        if game.current_players >= game.max_players:
            logger.error(f"Cannot join game {game_id}: game is full ({game.current_players}/{game.max_players})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join game: game is full"
            )

        # Проверяем что игрок еще не в игре
        if game.is_player_in_game(user_id):
            logger.info(f"User {current_user.username} is already in game {game_id}")
            return {"message": "Already in game"}

        # Проверяем что пользователь участник кампании
        campaign_query = select(Campaign).where(Campaign.id == game.campaign_id)
        campaign_result = await db.execute(campaign_query)
        campaign = campaign_result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        is_creator = str(campaign.creator_id) == user_id
        is_participant = user_id in (campaign.players or [])

        if not (is_creator or is_participant):
            logger.error(f"User {current_user.username} is not a participant of campaign {game.campaign_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign participants can join the game"
            )

        # Валидация персонажа если указан
        character_id_to_use = None
        if join_data.character_id:
            character_id_to_use = str(join_data.character_id)

            # Проверяем что персонаж существует и принадлежит пользователю
            from app.models.character import Character
            char_query = select(Character).where(
                and_(
                    Character.id == character_id_to_use,
                    Character.owner_id == current_user.id
                )
            )
            char_result = await db.execute(char_query)
            character = char_result.scalar_one_or_none()

            if not character:
                logger.error(f"Character {character_id_to_use} not found or not owned by user {current_user.username}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Character not found or not owned by user"
                )

        # Присоединяем игрока к игре
        if game.add_player(user_id, character_id_to_use):
            await db.commit()
            logger.info(f"User {current_user.username} successfully joined game {game_id}")
            return {"message": "Successfully joined game"}
        else:
            logger.error(f"Failed to add user {current_user.username} to game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to join game"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join game: {str(e)}"
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

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

        if not game:
            logger.error(f"Game {game_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found"
            )

        user_id = str(current_user.id)

        # Проверяем что игрок в игре
        if not game.is_player_in_game(user_id):
            logger.warning(f"User {current_user.username} is not in game {game_id}")
            return {"message": "Not in game"}

        # Удаляем игрока из игры
        if game.remove_player(user_id):
            await db.commit()
            logger.info(f"User {current_user.username} successfully left game {game_id}")
            return {"message": "Successfully left game"}
        else:
            logger.error(f"Failed to remove user {current_user.username} from game {game_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to leave game"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving game {game_id}: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave game: {str(e)}"
        )

@router.post("/{game_id}/start")
async def start_game(
        game_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Начать игровую сессию"""
    try:
        logger.info(f"User {current_user.username} starting game {game_id}")

        query = select(Game).where(Game.id == game_id)
        result = await db.execute(query)
        game = result.scalar_one_or_none()

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
            logger.error(f"User {current_user.username} is not the creator of campaign {game.campaign_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only campaign creator can start the game"
            )

        if game.start_game():
            await db.commit()
            logger.info(f"Game {game_id} started successfully by {current_user.username}")
            return {"message": "Game started successfully"}
        else:
            logger.error(f"Cannot start game {game_id}: no players or game not in waiting status")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start game: no players or game not in waiting status"
            )

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