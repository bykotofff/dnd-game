from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.core.database import get_db_session
from app.models.character import Character
from app.models.user import User
from app.api.auth import get_current_user
from app.services.image_service import image_service

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic модели
class CharacterCreate(BaseModel):
    name: str
    race: str
    character_class: str
    subclass: Optional[str] = None
    background: Optional[str] = None
    alignment: Optional[str] = None

    # Характеристики
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10

    # Описание
    appearance: Optional[str] = None
    personality_traits: Optional[str] = None
    ideals: Optional[str] = None
    bonds: Optional[str] = None
    flaws: Optional[str] = None
    backstory: Optional[str] = None


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    experience_points: Optional[int] = None

    # Характеристики
    strength: Optional[int] = None
    dexterity: Optional[int] = None
    constitution: Optional[int] = None
    intelligence: Optional[int] = None
    wisdom: Optional[int] = None
    charisma: Optional[int] = None

    # HP и защита
    max_hit_points: Optional[int] = None
    current_hit_points: Optional[int] = None
    temporary_hit_points: Optional[int] = None
    armor_class: Optional[int] = None

    # Навыки и владения
    skills: Optional[Dict[str, Any]] = None
    proficiencies: Optional[Dict[str, Any]] = None

    # Инвентарь
    inventory: Optional[Dict[str, Any]] = None

    # Заклинания
    spells: Optional[Dict[str, Any]] = None

    # Способности и эффекты
    features: Optional[List[Dict[str, Any]]] = None
    active_effects: Optional[List[Dict[str, Any]]] = None

    # Описание
    appearance: Optional[str] = None
    personality_traits: Optional[str] = None
    ideals: Optional[str] = None
    bonds: Optional[str] = None
    flaws: Optional[str] = None
    backstory: Optional[str] = None


class CharacterResponse(BaseModel):
    id: str
    name: str
    race: str
    character_class: str
    level: int
    owner_id: str
    is_alive: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=CharacterResponse)
async def create_character(
        character_data: CharacterCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Создать нового персонажа"""
    try:
        # ✅ ИСПРАВЛЕНИЕ: Фильтруем данные и убираем лишние поля
        character_dict = character_data.model_dump()
        # Убираем поля которые рассчитываются автоматически
        excluded_fields = {
            'max_hit_points', 'current_hit_points', 'temporary_hit_points',
            'armor_class', 'speed', 'proficiency_bonus', 'experience_points'
        }
        filtered_data = {k: v for k, v in character_dict.items()
                         if k not in excluded_fields and v is not None}

        # ✅ Устанавливаем значения по умолчанию для обязательных полей
        filtered_data.setdefault('level', 1)
        filtered_data.setdefault('experience_points', 0)

        # Создаем персонажа
        character = Character(
            owner_id=current_user.id,
            **filtered_data
        )

        # ✅ ИСПРАВЛЕНИЕ: Устанавливаем значения по умолчанию перед расчетом HP
        if not hasattr(character, 'constitution') or character.constitution is None:
            character.constitution = 10
        if not hasattr(character, 'dexterity') or character.dexterity is None:
            character.dexterity = 10
        if not hasattr(character, 'level') or character.level is None:
            character.level = 1

        # Рассчитываем начальные HP
        character.max_hit_points = character.calculate_max_hp()
        character.current_hit_points = character.max_hit_points
        character.temporary_hit_points = 0

        # Рассчитываем AC
        dex_modifier = character.get_ability_modifier(character.dexterity)
        character.armor_class = 10 + dex_modifier

        # Устанавливаем другие значения по умолчанию
        character.speed = 30
        character.proficiency_bonus = 2

        db.add(character)
        await db.commit()
        await db.refresh(character)

        logger.info(f"Character created: {character.name} by {current_user.username}")

        return CharacterResponse(
            id=str(character.id),
            name=character.name,
            race=character.race,
            character_class=character.character_class,
            level=character.level,
            owner_id=str(character.owner_id),
            is_alive=character.is_alive,
            created_at=character.created_at.isoformat()
        )

    except Exception as e:
        logger.error(f"Error creating character: {e}")
        logger.error(f"Character data: {character_data}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create character: {str(e)}"
        )


@router.get("/", response_model=List[CharacterResponse])
async def get_user_characters(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session),
        active_only: bool = True
):
    """Получить персонажей пользователя"""
    try:
        query = select(Character).where(Character.owner_id == current_user.id)

        if active_only:
            query = query.where(Character.is_active == True)

        query = query.order_by(Character.created_at.desc())

        result = await db.execute(query)
        characters = result.scalars().all()

        return [
            CharacterResponse(
                id=str(char.id),
                name=char.name,
                race=char.race,
                character_class=char.character_class,
                level=char.level,
                owner_id=str(char.owner_id),
                is_alive=char.is_alive,
                created_at=char.created_at.isoformat()
            )
            for char in characters
        ]

    except Exception as e:
        logger.error(f"Error getting characters: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get characters"
        )


@router.get("/{character_id}")
async def get_character(
        character_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить подробную информацию о персонаже"""
    try:
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        return character.get_character_sheet()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting character {character_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get character"
        )


@router.put("/{character_id}")
async def update_character(
        character_id: str,
        update_data: CharacterUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Обновить персонажа"""
    try:
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Обновляем только переданные поля
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            if hasattr(character, field):
                setattr(character, field, value)

        # Пересчитываем максимальные HP если изменились характеристики
        if any(attr in update_dict for attr in ['level', 'constitution']):
            character.max_hit_points = character.calculate_max_hp()
            # Если текущие HP больше новых максимальных, корректируем
            if character.current_hit_points > character.max_hit_points:
                character.current_hit_points = character.max_hit_points

        await db.commit()
        await db.refresh(character)

        logger.info(f"Character updated: {character.name}")

        return character.get_character_sheet()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating character {character_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update character"
        )


@router.delete("/{character_id}")
async def delete_character(
        character_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Удалить персонажа (мягкое удаление)"""
    try:
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Мягкое удаление
        character.is_active = False
        await db.commit()

        logger.info(f"Character deleted: {character.name}")

        return {"message": "Character deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting character {character_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete character"
        )


@router.post("/{character_id}/damage")
async def take_damage(
        character_id: str,
        damage: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Нанести урон персонажу"""
    try:
        if damage < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Damage cannot be negative"
            )

        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Наносим урон
        damage_result = character.take_damage(damage)
        await db.commit()

        logger.info(f"Character {character.name} took {damage} damage")

        return {
            "message": f"Dealt {damage} damage",
            "result": damage_result,
            "character_status": {
                "current_hp": character.current_hit_points,
                "max_hp": character.max_hit_points,
                "is_alive": character.is_alive
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dealing damage to character {character_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deal damage"
        )


@router.post("/{character_id}/heal")
async def heal_character(
        character_id: str,
        healing: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Исцелить персонажа"""
    try:
        if healing < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Healing cannot be negative"
            )

        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Исцеляем
        heal_result = character.heal(healing)
        await db.commit()

        logger.info(f"Character {character.name} healed for {healing}")

        return {
            "message": f"Healed for {heal_result['healing_received']}",
            "result": heal_result,
            "character_status": {
                "current_hp": character.current_hit_points,
                "max_hp": character.max_hit_points,
                "is_alive": character.is_alive
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error healing character {character_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to heal character"
        )


@router.post("/{character_id}/portrait")
async def generate_character_portrait(
        character_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session),
        custom_prompt: Optional[str] = None
):
    """Сгенерировать портрет персонажа"""
    try:
        query = select(Character).where(
            and_(
                Character.id == character_id,
                Character.owner_id == current_user.id
            )
        )
        result = await db.execute(query)
        character = result.scalar_one_or_none()

        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Character not found"
            )

        # Получаем данные персонажа для генерации
        character_data = character.get_character_sheet()

        # Генерируем портрет
        image_bytes = await image_service.generate_character_portrait(
            character_data, custom_prompt
        )

        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate portrait"
            )

        # Сохраняем изображение
        filename = f"character_{character_id}_portrait.png"
        file_path = await image_service.save_image(
            image_bytes, filename, "characters"
        )

        if file_path:
            # Обновляем URL портрета в базе
            character.portrait_url = f"/static/{file_path}"
            await db.commit()

        logger.info(f"Generated portrait for character: {character.name}")

        return {
            "message": "Portrait generated successfully",
            "portrait_url": character.portrait_url,
            "character_id": character_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating portrait for character {character_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate portrait"
        )