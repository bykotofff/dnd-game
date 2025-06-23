from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.core.database import get_db_session
from app.models.user import User
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPublicProfile(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    games_played: int
    created_at: str

    class Config:
        from_attributes = True


@router.get("/me")
async def get_my_profile(
        current_user: User = Depends(get_current_user)
):
    """Получить свой профиль"""
    return current_user.get_full_profile()


@router.put("/me")
async def update_my_profile(
        profile_data: UserProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session)
):
    """Обновить свой профиль"""
    try:
        # Обновляем только переданные поля
        update_dict = profile_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            if hasattr(current_user, field):
                setattr(current_user, field, value)

        await db.commit()
        await db.refresh(current_user)

        logger.info(f"Profile updated for user: {current_user.username}")

        return current_user.get_full_profile()

    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.get("/{user_id}", response_model=UserPublicProfile)
async def get_user_profile(
        user_id: str,
        db: AsyncSession = Depends(get_db_session)
):
    """Получить публичный профиль пользователя"""
    try:
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        profile_data = user.get_public_profile()
        return UserPublicProfile(**profile_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.get("/", response_model=List[UserPublicProfile])
async def search_users(
        query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        db: AsyncSession = Depends(get_db_session)
):
    """Поиск пользователей"""
    try:
        sql_query = select(User).where(User.is_active == True)

        if query:
            # Простой поиск по username и display_name
            search_filter = (
                    User.username.ilike(f"%{query}%") |
                    User.display_name.ilike(f"%{query}%")
            )
            sql_query = sql_query.where(search_filter)

        sql_query = sql_query.offset(offset).limit(limit).order_by(User.created_at.desc())

        result = await db.execute(sql_query)
        users = result.scalars().all()

        return [
            UserPublicProfile(**user.get_public_profile())
            for user in users
        ]

    except Exception as e:
        logger.error(f"Error searching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search users"
        )