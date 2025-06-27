from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import logging
import base64
from datetime import datetime
import os

from app.core.database import get_db_session
from app.models.user import User
from app.api.auth import get_current_user
from app.services.image_service import image_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Описание для генерации изображения")
    negative_prompt: Optional[str] = Field(None, description="Что исключить из изображения")
    style: str = Field(default="character_portrait", description="Стиль изображения")
    width: int = Field(default=512, ge=256, le=1024, description="Ширина изображения")
    height: int = Field(default=512, ge=256, le=1024, description="Высота изображения")
    steps: int = Field(default=20, ge=10, le=50, description="Количество шагов генерации")
    cfg_scale: float = Field(default=7.5, ge=1.0, le=20.0, description="Сила следования промпту")
    seed: int = Field(default=-1, description="Сид для воспроизводимости (-1 для случайного)")


class ImageGenerationResponse(BaseModel):
    success: bool
    image_url: str
    prompt: str
    generation_time: float
    message: str


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
        request: ImageGenerationRequest,
        current_user: User = Depends(get_current_user)
):
    """Генерировать изображение с помощью Stable Diffusion"""
    try:
        start_time = datetime.now()

        logger.info(f"Generating image for user {current_user.username} with prompt: {request.prompt[:100]}...")

        # Проверяем доступность сервиса
        if not await image_service.health_check():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Image generation service is not available. Please check Stable Diffusion setup."
            )

        # Генерируем изображение
        image_bytes = await image_service.generate_image(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            style=request.style,
            width=request.width,
            height=request.height,
            steps=request.steps,
            cfg_scale=request.cfg_scale,
            seed=request.seed if request.seed != -1 else None
        )

        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate image. Please try again or adjust your prompt."
            )

        # Сохраняем изображение
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"generated_{current_user.id}_{timestamp}.png"

        file_path = await image_service.save_image(
            image_bytes,
            filename=filename,
            subdirectory="generated"
        )

        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save generated image"
            )

        # Создаем URL для доступа к изображению
        image_url = f"/static/generated/{filename}"

        generation_time = (datetime.now() - start_time).total_seconds()

        logger.info(f"Image generated successfully in {generation_time:.2f}s for user {current_user.username}")

        return ImageGenerationResponse(
            success=True,
            image_url=image_url,
            prompt=request.prompt,
            generation_time=generation_time,
            message="Image generated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the image"
        )


@router.get("/styles")
async def get_available_styles():
    """Получить список доступных стилей для генерации"""
    return {
        "styles": {
            "character_portrait": {
                "name": "Портрет персонажа",
                "description": "Детализированный портрет в стиле D&D",
                "best_for": "Персонажи, НПС"
            },
            "location": {
                "name": "Локация",
                "description": "Пейзажи и места в фэнтези стиле",
                "best_for": "Города, подземелья, природные локации"
            },
            "item": {
                "name": "Предмет",
                "description": "Магические предметы и артефакты",
                "best_for": "Оружие, броня, магические предметы"
            },
            "creature": {
                "name": "Существо",
                "description": "Монстры и фантастические создания",
                "best_for": "Драконы, монстры, магические существа"
            }
        },
        "parameters": {
            "width": {"min": 256, "max": 1024, "default": 512},
            "height": {"min": 256, "max": 1024, "default": 512},
            "steps": {"min": 10, "max": 50, "default": 20},
            "cfg_scale": {"min": 1.0, "max": 20.0, "default": 7.5}
        }
    }


@router.get("/health")
async def check_image_service_health():
    """Проверить состояние сервиса генерации изображений"""
    try:
        is_healthy = await image_service.health_check()

        return {
            "service": "image_generation",
            "status": "healthy" if is_healthy else "unhealthy",
            "stable_diffusion_url": settings.SD_URL,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error checking image service health: {e}")
        return {
            "service": "image_generation",
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


# Дополнительные эндпоинты для удобства

@router.post("/generate-character-portrait")
async def generate_character_portrait_standalone(
        character_name: str,
        race: str,
        character_class: str,
        description: Optional[str] = None,
        style: str = "realistic",
        current_user: User = Depends(get_current_user)
):
    """Быстрая генерация портрета персонажа по базовым параметрам"""

    # Формируем промпт автоматически
    prompt_parts = [character_name, race, character_class]

    if description:
        prompt_parts.append(description)

    # Добавляем стилевые модификаторы
    style_modifiers = {
        "realistic": "photorealistic, detailed face, high quality portrait",
        "fantasy": "fantasy art, painterly style, dramatic lighting",
        "anime": "anime style, cel shading, detailed anime portrait",
        "oil-painting": "oil painting style, classical art, detailed brushwork",
        "digital-art": "digital art, concept art style, detailed illustration"
    }

    if style in style_modifiers:
        prompt_parts.append(style_modifiers[style])

    prompt = ", ".join(prompt_parts)

    # Используем основную функцию генерации
    request = ImageGenerationRequest(
        prompt=prompt,
        style="character_portrait",
        width=512,
        height=768,  # Портретная ориентация
        steps=25,
        cfg_scale=7.5
    )

    return await generate_image(request, current_user)