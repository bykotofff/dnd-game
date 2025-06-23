from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.core.database import get_db_session
from app.models.campaign import Campaign, CampaignStatus
from app.models.user import User
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    setting: Optional[str] = None
    max_players: int = 6
    world_description: Optional[str] = None
    main_story: Optional[str] = None
    house_rules: Optional[str] = None
    starting_level: int = 1
    settings: Optional[Dict[str, Any]] = None
    ai_personality: Optional[str] = None
    ai_style: str = "balanced"
    is_public: bool = False
    requires_approval: bool = True


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    setting: Optional[str] = None
    max_players: Optional[int] = None
    world_description: Optional[str] = None
    main_story: Optional[str] = None
    house_rules: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    ai_personality: Optional[str] = None
    ai_style: Optional[str] = None
    is_public: Optional[bool] = None
    requires_approval: Optional[bool] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    setting: Optional[str]
    status: str
    creator_id: str
    current_players: int
    max_players: int
    starting_level: int
    is_public: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=CampaignResponse)
async def create_campaign(
        campaign_data: CampaignCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Создать новую кампанию"""
    try:
        # Создаем кампанию
        campaign = Campaign(
            creator_id=current_user.id,
            **campaign_data.model_dump()
        )

        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)

        logger.info(f"Campaign created: {campaign.name} by {current_user.username}")

        campaign_info = campaign.get_campaign_info()
        return CampaignResponse(**campaign_info)

    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create campaign"
        )


@router.get("/", response_model=List[CampaignResponse])
async def get_campaigns(
        status_filter: Optional[str] = None,
        public_only: bool = False,
        my_campaigns: bool = False,
        limit: int = 20,
        offset: int = 0,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить список кампаний"""
    try:
        query = select(Campaign)

        # Фильтры
        if my_campaigns:
            query = query.where(Campaign.creator_id == current_user.id)
        elif public_only:
            query = query.where(Campaign.is_public == True)

        if status_filter:
            try:
                status_enum = CampaignStatus(status_filter)
                query = query.where(Campaign.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}"
                )

        query = query.offset(offset).limit(limit).order_by(Campaign.created_at.desc())

        result = await db.execute(query)
        campaigns = result.scalars().all()

        response_data = []
        for campaign in campaigns:
            if public_only and not campaign.is_public:
                campaign_info = campaign.get_public_info()
            else:
                campaign_info = campaign.get_campaign_info()

            response_data.append(CampaignResponse(**campaign_info))

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaigns: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get campaigns"
        )


@router.get("/{campaign_id}")
async def get_campaign(
        campaign_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить информацию о кампании"""
    try:
        query = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        # Проверяем права доступа
        user_id = str(current_user.id)
        is_creator = str(campaign.creator_id) == user_id
        is_player = user_id in campaign.players
        is_public = campaign.is_public

        if not (is_creator or is_player or is_public):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Возвращаем соответствующую информацию
        if is_creator or is_player:
            return campaign.get_campaign_info()
        else:
            return campaign.get_public_info()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaign {campaign_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get campaign"
        )


@router.put("/{campaign_id}")
async def update_campaign(
        campaign_id: str,
        update_data: CampaignUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Обновить кампанию"""
    try:
        query = select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.creator_id == current_user.id
            )
        )
        result = await db.execute(query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found or access denied"
            )

        # Обновляем кампанию
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(campaign, field):
                setattr(campaign, field, value)

        await db.commit()
        await db.refresh(campaign)

        logger.info(f"Campaign updated: {campaign.name}")

        return campaign.get_campaign_info()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign {campaign_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update campaign"
        )


@router.delete("/{campaign_id}")
async def delete_campaign(
        campaign_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Удалить кампанию"""
    try:
        query = select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.creator_id == current_user.id
            )
        )
        result = await db.execute(query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found or access denied"
            )

        # Архивируем кампанию вместо удаления
        campaign.status = CampaignStatus.ARCHIVED
        await db.commit()

        logger.info(f"Campaign archived: {campaign.name}")

        return {"message": "Campaign archived successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign {campaign_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete campaign"
        )


@router.post("/{campaign_id}/join")
async def join_campaign(
        campaign_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Присоединиться к кампании"""
    try:
        query = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        user_id = str(current_user.id)

        if not campaign.can_join(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join this campaign"
            )

        if not campaign.add_player(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to join campaign"
            )

        await db.commit()

        logger.info(f"User {current_user.username} joined campaign {campaign.name}")

        return {"message": "Successfully joined campaign"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining campaign {campaign_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join campaign"
        )


@router.post("/{campaign_id}/leave")
async def leave_campaign(
        campaign_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Покинуть кампанию"""
    try:
        query = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(query)
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        user_id = str(current_user.id)

        if not campaign.remove_player(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not in this campaign"
            )

        await db.commit()

        logger.info(f"User {current_user.username} left campaign {campaign.name}")

        return {"message": "Successfully left campaign"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving campaign {campaign_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to leave campaign"
        )