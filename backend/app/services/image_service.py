import httpx
import asyncio
import base64
import io
from PIL import Image
from typing import Optional, Dict, Any, List
import logging
import os
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


class ImageService:
    """
    Сервис для генерации изображений через Stable Diffusion
    """

    def __init__(self):
        self.base_url = settings.SD_URL
        self.timeout = 120  # 2 минуты на генерацию
        self.client = httpx.AsyncClient(timeout=self.timeout)

        # Предустановленные стили для D&D
        self.dnd_styles = {
            "character_portrait": "fantasy art, detailed character portrait, dungeons and dragons style, high quality, digital art",
            "location": "fantasy landscape, dungeons and dragons, atmospheric, detailed environment art",
            "item": "fantasy item, magical artifact, dungeons and dragons, item art, clean background",
            "creature": "fantasy creature, monster art, dungeons and dragons, detailed beast"
        }

        # Настройки качества
        self.default_settings = {
            "width": 512,
            "height": 512,
            "steps": 20,
            "cfg_scale": 7.0,
            "sampler_name": "DPM++ 2M Karras",
        }

    async def health_check(self) -> bool:
        """Проверить доступность Stable Diffusion API"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Stable Diffusion health check failed: {e}")
            return False

    async def generate_image(
            self,
            prompt: str,
            negative_prompt: str = None,
            style: str = "character_portrait",
            width: int = 512,
            height: int = 512,
            steps: int = 20,
            cfg_scale: float = 7.0,
            seed: int = -1
    ) -> Optional[bytes]:
        """
        Генерировать изображение

        Args:
            prompt: Описание для генерации
            negative_prompt: Что исключить из изображения
            style: Стиль изображения (character_portrait, location, item, creature)
            width: Ширина изображения
            height: Высота изображения
            steps: Количество шагов генерации
            cfg_scale: Сила следования промпту
            seed: Сид для воспроизводимости (-1 для случайного)
        """
        try:
            # Добавляем стиль к промпту
            style_prompt = self.dnd_styles.get(style, self.dnd_styles["character_portrait"])
            full_prompt = f"{prompt}, {style_prompt}"

            # Базовый негативный промпт для D&D
            base_negative = "low quality, blurry, pixelated, distorted, ugly, deformed, modern clothing, modern technology, cars, phones, computers"
            if negative_prompt:
                full_negative = f"{negative_prompt}, {base_negative}"
            else:
                full_negative = base_negative

            # Параметры запроса
            request_data = {
                "prompt": full_prompt,
                "negative_prompt": full_negative,
                "width": width,
                "height": height,
                "steps": steps,
                "cfg_scale": cfg_scale,
                "sampler_name": "DPM++ 2M Karras",
                "seed": seed if seed != -1 else None,
                "batch_size": 1,
                "n_iter": 1,
            }

            logger.info(f"Generating image with prompt: {prompt[:100]}...")

            # Отправляем запрос на генерацию
            response = await self.client.post(
                f"{self.base_url}/generate",
                json=request_data
            )

            if response.status_code != 200:
                logger.error(f"Image generation failed: {response.status_code} - {response.text}")
                return None

            result = response.json()

            # Извлекаем base64 изображение
            if "images" not in result or not result["images"]:
                logger.error("No images in response")
                return None

            image_base64 = result["images"][0]
            image_bytes = base64.b64decode(image_base64)

            logger.info("Image generated successfully")
            return image_bytes

        except Exception as e:
            logger.error(f"Error generating image: {e}")
            return None

    async def generate_character_portrait(
            self,
            character_data: Dict[str, Any],
            custom_prompt: str = None
    ) -> Optional[bytes]:
        """
        Генерировать портрет персонажа

        Args:
            character_data: Данные персонажа
            custom_prompt: Дополнительное описание
        """
        try:
            # Строим промпт на основе данных персонажа
            race = character_data.get("race", "human").lower()
            character_class = character_data.get("character_class", "adventurer").lower()
            gender = character_data.get("gender", "").lower()
            appearance = character_data.get("appearance", "")

            # Базовый промпт
            prompt_parts = []

            # Пол и раса
            if gender:
                prompt_parts.append(gender)
            prompt_parts.append(race)

            # Класс
            prompt_parts.append(character_class)

            # Внешность
            if appearance:
                prompt_parts.append(appearance)

            # Дополнительные детали
            if custom_prompt:
                prompt_parts.append(custom_prompt)

            prompt = ", ".join(prompt_parts)

            # Негативный промпт для портретов
            negative_prompt = "armor clipping, weapon floating, multiple heads, multiple arms, deformed hands, extra fingers"

            return await self.generate_image(
                prompt=prompt,
                negative_prompt=negative_prompt,
                style="character_portrait",
                width=512,
                height=768  # Портретная ориентация
            )

        except Exception as e:
            logger.error(f"Error generating character portrait: {e}")
            return None

    async def generate_location_image(
            self,
            location_name: str,
            location_type: str,
            description: str = None,
            atmosphere: str = "neutral"
    ) -> Optional[bytes]:
        """
        Генерировать изображение локации
        """
        try:
            prompt_parts = [location_name, location_type]

            if description:
                prompt_parts.append(description)

            # Атмосфера
            atmosphere_prompts = {
                "dark": "dark, ominous, shadows, mysterious",
                "bright": "bright, cheerful, sunny, welcoming",
                "mysterious": "mysterious, foggy, enigmatic, ancient",
                "dangerous": "dangerous, threatening, foreboding, scary",
                "peaceful": "peaceful, serene, calm, beautiful",
                "neutral": "atmospheric, detailed, immersive"
            }

            if atmosphere in atmosphere_prompts:
                prompt_parts.append(atmosphere_prompts[atmosphere])

            prompt = ", ".join(prompt_parts)

            return await self.generate_image(
                prompt=prompt,
                style="location",
                width=768,
                height=512  # Пейзажная ориентация
            )

        except Exception as e:
            logger.error(f"Error generating location image: {e}")
            return None

    async def generate_npc_portrait(
            self,
            npc_data: Dict[str, Any]
    ) -> Optional[bytes]:
        """
        Генерировать портрет НПС
        """
        try:
            name = npc_data.get("name", "")
            race = npc_data.get("race", "human")
            profession = npc_data.get("profession", "")
            appearance = npc_data.get("appearance", "")
            personality = npc_data.get("personality", "")

            prompt_parts = [race]

            if profession:
                prompt_parts.append(profession)

            if appearance:
                prompt_parts.append(appearance)

            if personality:
                # Преобразуем черты личности в визуальные подсказки
                personality_visuals = {
                    "friendly": "smiling, kind eyes, welcoming expression",
                    "stern": "serious expression, firm gaze",
                    "mysterious": "hooded, shadowy, enigmatic expression",
                    "cheerful": "bright smile, happy expression",
                    "grumpy": "frowning, scowling, irritated expression",
                    "wise": "aged, thoughtful expression, knowing eyes",
                    "young": "youthful, energetic appearance",
                    "old": "aged, weathered, experienced"
                }

                for trait, visual in personality_visuals.items():
                    if trait in personality.lower():
                        prompt_parts.append(visual)
                        break

            prompt = ", ".join(prompt_parts)

            return await self.generate_image(
                prompt=prompt,
                style="character_portrait",
                width=512,
                height=512
            )

        except Exception as e:
            logger.error(f"Error generating NPC portrait: {e}")
            return None

    async def generate_item_image(
            self,
            item_name: str,
            item_type: str,
            description: str = None,
            magical: bool = False
    ) -> Optional[bytes]:
        """
        Генерировать изображение предмета
        """
        try:
            prompt_parts = [item_name, item_type]

            if description:
                prompt_parts.append(description)

            if magical:
                prompt_parts.append("magical, glowing, enchanted, mystical aura")

            prompt = ", ".join(prompt_parts)

            negative_prompt = "hands holding, character, person, background clutter"

            return await self.generate_image(
                prompt=prompt,
                negative_prompt=negative_prompt,
                style="item",
                width=512,
                height=512
            )

        except Exception as e:
            logger.error(f"Error generating item image: {e}")
            return None

    async def save_image(
            self,
            image_bytes: bytes,
            filename: str = None,
            subdirectory: str = "generated"
    ) -> Optional[str]:
        """
        Сохранить изображение в файловую систему

        Returns:
            Путь к сохраненному файлу
        """
        try:
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"image_{timestamp}.png"

            # Создаем директорию если не существует
            save_dir = os.path.join(settings.UPLOAD_DIR, subdirectory)
            os.makedirs(save_dir, exist_ok=True)

            # Полный путь к файлу
            file_path = os.path.join(save_dir, filename)

            # Сохраняем изображение
            with open(file_path, "wb") as f:
                f.write(image_bytes)

            # Возвращаем относительный путь
            return os.path.join(subdirectory, filename)

        except Exception as e:
            logger.error(f"Error saving image: {e}")
            return None

    async def resize_image(
            self,
            image_bytes: bytes,
            width: int,
            height: int,
            maintain_aspect: bool = True
    ) -> Optional[bytes]:
        """
        Изменить размер изображения
        """
        try:
            # Открываем изображение
            image = Image.open(io.BytesIO(image_bytes))

            if maintain_aspect:
                # Сохраняем пропорции
                image.thumbnail((width, height), Image.Resampling.LANCZOS)
            else:
                # Принудительно изменяем размер
                image = image.resize((width, height), Image.Resampling.LANCZOS)

            # Конвертируем обратно в bytes
            output = io.BytesIO()
            image.save(output, format="PNG")
            return output.getvalue()

        except Exception as e:
            logger.error(f"Error resizing image: {e}")
            return None

    async def create_thumbnail(
            self,
            image_bytes: bytes,
            size: int = 256
    ) -> Optional[bytes]:
        """
        Создать миниатюру изображения
        """
        return await self.resize_image(image_bytes, size, size, maintain_aspect=True)

    async def get_image_info(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Получить информацию об изображении
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            return {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode,
                "size_bytes": len(image_bytes)
            }
        except Exception as e:
            logger.error(f"Error getting image info: {e}")
            return {}

    async def close(self):
        """Закрыть HTTP клиент"""
        await self.client.aclose()


# Глобальный экземпляр сервиса изображений
image_service = ImageService()