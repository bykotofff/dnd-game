from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.core.database import get_db_session
from app.models.user import User
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# Pydantic модели для API
class UserRegistration(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str  # Может быть username или email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str
    username: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/register", response_model=TokenResponse)
async def register(
        user_data: UserRegistration,
        db: AsyncSession = Depends(get_db_session)
):
    """Регистрация нового пользователя"""
    try:
        # Проверяем, что пользователь с таким username или email не существует
        existing_user_query = select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
        result = await db.execute(existing_user_query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.username == user_data.username:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered"
                )

        # Создаем нового пользователя
        hashed_password = auth_service.get_password_hash(user_data.password)

        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            display_name=user_data.display_name or user_data.username,
            is_active=True,
            is_verified=False
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Создаем токены
        tokens = await auth_service.create_user_tokens(new_user)

        logger.info(f"New user registered: {user_data.username}")

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            user_id=str(new_user.id),
            username=new_user.username
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
        credentials: UserLogin,
        db: AsyncSession = Depends(get_db_session)
):
    """Аутентификация пользователя"""
    try:
        user = await auth_service.authenticate_user(
            db, credentials.username, credentials.password
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Создаем токены
        tokens = await auth_service.create_user_tokens(user)

        logger.info(f"User logged in: {user.username}")

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            user_id=str(user.id),
            username=user.username
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
        refresh_data: RefreshTokenRequest,
        db: AsyncSession = Depends(get_db_session)
):
    """Обновление access токена"""
    try:
        tokens = await auth_service.refresh_access_token(
            refresh_data.refresh_token, db
        )

        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Получаем информацию о пользователе из нового токена
        payload = auth_service.verify_token(tokens["access_token"])
        user_id = payload.get("sub")
        username = payload.get("username")

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            user_id=user_id,
            username=username
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db_session)
):
    """Выход из системы"""
    try:
        # Получаем текущего пользователя
        user = await auth_service.get_current_user(credentials.credentials, db)

        if user:
            # Удаляем сессию из Redis
            await auth_service.logout_user(str(user.id))
            logger.info(f"User logged out: {user.username}")

        return {"message": "Successfully logged out"}

    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Не возвращаем ошибку, так как выход должен всегда срабатывать
        return {"message": "Logged out"}


@router.get("/me")
async def get_current_user_info(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db_session)
):
    """Получить информацию о текущем пользователе"""
    try:
        user = await auth_service.get_current_user(credentials.credentials, db)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        return user.get_full_profile()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )


@router.post("/change-password")
async def change_password(
        password_data: ChangePasswordRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db_session)
):
    """Смена пароля"""
    try:
        user = await auth_service.get_current_user(credentials.credentials, db)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        success = await auth_service.change_password(
            user, password_data.old_password, password_data.new_password, db
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid old password"
            )

        logger.info(f"Password changed for user: {user.username}")
        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


@router.get("/validate")
async def validate_token(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db_session)
):
    """Проверка валидности токена"""
    try:
        user = await auth_service.get_current_user(credentials.credentials, db)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        return {
            "valid": True,
            "user_id": str(user.id),
            "username": user.username,
            "is_admin": user.is_admin
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed"
        )


# Dependency для получения текущего пользователя
async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db_session)
) -> User:
    """Dependency для получения текущего пользователя"""
    user = await auth_service.get_current_user(credentials.credentials, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# Dependency для проверки админских прав
async def get_admin_user(
        current_user: User = Depends(get_current_user)
) -> User:
    """Dependency для проверки админских прав"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user