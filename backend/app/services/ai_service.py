# backend/app/services/ai_service.py

import httpx
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.config import settings
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)


class AIService:
    """
    Сервис для работы с Ollama (ИИ Данжеон Мастер)
    """

    def __init__(self):
        self.base_url = settings.OLLAMA_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.AI_RESPONSE_TIMEOUT
        self.max_context_length = settings.MAX_CONTEXT_LENGTH
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def health_check(self) -> bool:
        """Проверить доступность Ollama"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False

    async def generate_response(
            self,
            prompt: str,
            context: Optional[str] = None,
            system_prompt: Optional[str] = None,
            temperature: float = 0.7,
            max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """
        Генерировать ответ от ИИ
        """
        try:
            # Подготавливаем сообщения
            messages = []

            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })

            if context:
                messages.append({
                    "role": "assistant",
                    "content": f"Контекст игры: {context}"
                })

            messages.append({
                "role": "user",
                "content": prompt
            })

            # Параметры генерации
            request_data = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens or 1000,
                }
            }

            # Отправляем запрос
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=request_data
            )

            if response.status_code != 200:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return None

            result = response.json()
            return result.get("message", {}).get("content", "").strip()

        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return None

    def _get_dm_system_prompt(self) -> str:
        """Получить системный промпт для Данжеон Мастера"""
        return """Ты - опытный Данжеон Мастер в D&D 5e. Твоя цель - создать захватывающую игру для всех.

СТИЛЬ ВЕДЕНИЯ:
- Описывай происходящее живо и атмосферно
- Создавай интригу и напряжение
- Реагируй на действия игроков логично
- Задавай вопросы и предлагай выборы
- Следи за балансом сложности

ПРАВИЛА:
- Следуй официальным правилам D&D 5e
- Учитывай характеристики персонажей
- Определяй DC проверок справедливо
- Описывай последствия действий

ПОВЕСТВОВАНИЕ:
- Используй яркие описания
- Создавай запоминающихся NPC
- Развивай сюжет динамично
- Завершай ответы вопросом "Что вы делаете?"

Отвечай ТОЛЬКО на русском языке."""

    def _build_game_context(
            self,
            game_context: Dict[str, Any],
            character_sheets: List[Dict[str, Any]],
            recent_messages: List[str]
    ) -> str:
        """Построить контекст игры для ИИ"""
        context_parts = []

        # Основная информация об игре
        if game_context.get('campaign_name'):
            context_parts.append(f"Кампания: {game_context['campaign_name']}")

        if game_context.get('current_scene'):
            context_parts.append(f"Текущая сцена: {game_context['current_scene']}")

        # Информация о персонажах
        if character_sheets:
            context_parts.append("Персонажи в партии:")
            for char in character_sheets:
                char_info = f"- {char.get('name')} ({char.get('race')} {char.get('character_class')}, {char.get('level')} ур.)"
                if char.get('current_hit_points') is not None:
                    char_info += f" HP: {char['current_hit_points']}/{char.get('max_hit_points', 0)}"
                context_parts.append(char_info)

        # Состояние мира
        if game_context.get('world_state'):
            world_state = game_context['world_state']
            if world_state:
                context_parts.append("Состояние мира:")
                for key, value in world_state.items():
                    context_parts.append(f"- {key}: {value}")

        # Последние сообщения (сокращенно)
        if recent_messages:
            context_parts.append("Недавние события:")
            for msg in recent_messages[-5:]:  # Последние 5 сообщений
                context_parts.append(f"- {msg}")

        return "\n".join(context_parts)

    async def analyze_player_action(
            self,
            action: str,
            character_data: Dict[str, Any],
            current_situation: str = ""
    ) -> Dict[str, Any]:
        """
        Анализировать действие игрока для определения нужных проверок
        """
        try:
            prompt = f"""
Проанализируй действие игрока в D&D и определи, нужна ли проверка кубиками:

Действие: {action}
Персонаж: {character_data.get('name', 'Неизвестный')} ({character_data.get('class', 'Неизвестный класс')})
Ситуация: {current_situation}

Ответь в формате JSON:
{{
  "нужен_бросок": "да/нет",
  "тип_броска": "атака/проверка_навыка/спасбросок/иное",
  "характеристика_или_навык": "сила/ловкость/мудрость/скрытность/убеждение/etc",
  "предполагаемый_DC": "число от 5 до 30",
  "преимущество_или_помеха": "преимущество/помеха/обычно"
}}

Если действие простое (говорить, идти по дороге) - не нужен бросок.
Если сложное (атака, скрытность, убеждение) - нужен бросок.
"""

            system_prompt = "Ты анализируешь действия игроков в D&D. Определяй проверки точно по правилам 5e."

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3
            )

            if response:
                # Попытка парсинга JSON ответа
                try:
                    # Ищем JSON в ответе
                    json_start = response.find('{')
                    json_end = response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = response[json_start:json_end]
                        parsed = json.loads(json_str)

                        # Конвертируем в английский формат для совместимости
                        result = {
                            "requires_roll": parsed.get("нужен_бросок", "нет").lower() == "да",
                            "roll_type": parsed.get("тип_броска", ""),
                            "ability_or_skill": parsed.get("характеристика_или_навык", ""),
                            "suggested_dc": parsed.get("предполагаемый_DC", ""),
                            "advantage_disadvantage": parsed.get("преимущество_или_помеха", "")
                        }
                        return result
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse AI response as JSON: {response}")

            # Фоллбэк: простой анализ
            action_lower = action.lower()
            needs_roll = any(keyword in action_lower for keyword in [
                'атак', 'удар', 'стрел', 'заклин', 'скрыт', 'кра', 'убежд', 'обман',
                'запугай', 'лазан', 'прыж', 'плава', 'лом', 'взлом', 'ищ', 'восприят'
            ])

            return {
                "requires_roll": needs_roll,
                "roll_type": "проверка_навыка" if needs_roll else "",
                "ability_or_skill": "",
                "suggested_dc": "15" if needs_roll else "",
                "advantage_disadvantage": "обычно"
            }

        except Exception as e:
            logger.error(f"Error analyzing player action: {e}")
            return {
                "requires_roll": False,
                "roll_type": "",
                "ability_or_skill": "",
                "suggested_dc": "",
                "advantage_disadvantage": ""
            }

    async def generate_dm_response(
            self,
            game_id: str,
            player_action: str,
            game_context: Dict[str, Any],
            character_sheets: List[Dict[str, Any]],
            recent_messages: List[str] = None
    ) -> Optional[str]:
        """
        Генерировать ответ Данжеон Мастера
        """
        try:
            # Получаем системный промпт для DM
            system_prompt = self._get_dm_system_prompt()

            # Строим контекст игры - ИСПРАВЛЕНО: теперь метод существует
            context = self._build_game_context(
                game_context,
                character_sheets,
                recent_messages or []
            )

            # Формируем промпт для действия игрока
            action_prompt = f"""
Действие игрока: {player_action}

Текущая ситуация: {game_context.get('current_scene', 'Неизвестная локация')}

Ответь как опытный Данжеон Мастер. Опиши результат действия игрока, создай атмосферное повествование и в конце спроси "Что вы делаете?" Не предлагай варианты действий.
"""

            # Кэшируем контекст
            await redis_client.cache_ai_context(game_id, context)

            # Генерируем ответ
            response = await self.generate_response(
                prompt=action_prompt,
                context=context,
                system_prompt=system_prompt,
                temperature=0.8
            )

            return response

        except Exception as e:
            logger.error(f"Error generating DM response for game {game_id}: {e}")
            return None

    async def generate_dice_result_response(
            self,
            action: str,
            roll_result: Dict[str, Any],
            dc: int,
            character_name: str,
            game_context: Dict[str, Any]
    ) -> Optional[str]:
        """
        Генерировать ответ ИИ на результат проверки кубиками (улучшенная версия)
        """
        try:
            base_roll = roll_result.get('base_roll', roll_result.get('total', 0))
            modifier = roll_result.get('modifier', 0)
            final_total = roll_result.get('total', base_roll + modifier)
            success = roll_result.get('success', final_total >= dc)
            skill = roll_result.get('skill', 'навык')

            # Определяем степень успеха/неудачи для более детального описания
            margin = abs(final_total - dc)

            if base_roll == 20:
                outcome_type = "критический_успех"
            elif base_roll == 1:
                outcome_type = "критический_провал"
            elif success:
                if margin >= 10:
                    outcome_type = "превосходный_успех"
                elif margin >= 5:
                    outcome_type = "хороший_успех"
                else:
                    outcome_type = "обычный_успех"
            else:
                if margin >= 10:
                    outcome_type = "серьезная_неудача"
                elif margin >= 5:
                    outcome_type = "обычная_неудача"
                else:
                    outcome_type = "едва_не_удалось"

            # Формируем модификатор как строку для отображения
            mod_display = f"+{modifier}" if modifier > 0 else str(modifier) if modifier < 0 else ""
            roll_display = f"[{base_roll}{mod_display} = {final_total}]"

            prompt = f"""
РЕЗУЛЬТАТ ПРОВЕРКИ В D&D:

Персонаж: {character_name}
Действие: {action}
Проверка: {skill}
Бросок: {base_roll} + {modifier} = {final_total}
Результат: {outcome_type.replace('_', ' ').title()}

Контекст: {game_context.get('current_scene', 'Игровая сцена')}

Опиши результат этой проверки ярко и кинематографично. 

СТИЛЬ ОТВЕТА:
- Начни с краткого описания результата броска: "{roll_display}"
- Опиши КАК именно действие удается или не удается
- Сделай повествование атмосферным и захватывающим
- Покажи последствия действия
- Закончи вопросом "Что вы делаете?"

ПРИМЕРЫ ХОРОШИХ ОТВЕТОВ:
- Критический успех: "Результат блестящий! Вы выполняете действие мастерски..."
- Обычный успех: "Вам удается справиться с задачей..."
- Едва не удалось: "Кажется, что вот-вот не получится, но..."
- Неудача: "Несмотря на усилия, что-то идет не так..."
- Критический провал: "Все идет наперекосяк самым неожиданным образом..."

НЕ раскрывай конкретные цифры DC или точные значения сложности!
"""

            system_prompt = self._get_dice_result_system_prompt()

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.8  # Высокая креативность для ярких описаний
            )

            return response

        except Exception as e:
            logger.error(f"Error generating dice result response: {e}")
            return None

    def _get_dice_result_system_prompt(self) -> str:
        """Системный промпт для ответов на результаты бросков"""
        return """Ты - опытный Данжеон Мастер в D&D 5e. Ты интерпретируешь результаты бросков костей и создаешь живое повествование.

ПРИНЦИПЫ ХОРОШЕГО МАСТЕРСТВА:
- Результат броска священен - не игнорируй кости
- Критические успехи (20) должны быть впечатляющими
- Критические провалы (1) должны быть интересными, не просто наказанием
- Даже неудачи должны продвигать историю вперед
- Создавай яркие, кинематографичные описания

СТИЛЬ ПОВЕСТВОВАНИЯ:
- Пиши от третьего лица ("вы", "ваш персонаж")
- Используй активные конструкции
- Создавай напряжение и атмосферу
- Показывай, не рассказывай
- Задействуй все чувства (зрение, слух, осязание)

СТРУКТУРА ОТВЕТА:
1. Результат броска в квадратных скобках
2. Описание того, как происходит действие
3. Последствия и детали
4. Вопрос "Что вы делаете?"

ПРИМЕРЫ ОТЛИЧНЫХ ОПИСАНИЙ:
✅ "Ваши пальцы находят идеальные зацепки на каменной стене"
✅ "Тень от облака в нужный момент скрывает вашу фигуру"
✅ "Ваши слова звучат так убедительно, что даже вы сами им верите"

❌ "Вы прошли проверку ловкости"
❌ "Бросок успешный"
❌ "Получается скрыться"

Отвечай ТОЛЬКО на русском языке!"""

    async def summarize_long_context(self, long_context: str) -> str:
        """Сократить длинный контекст для ИИ"""
        if len(long_context) <= self.max_context_length:
            return long_context

        try:
            prompt = f"""
Сократи этот игровой контекст D&D до ключевых моментов:

{long_context}

Сохрани самое важное: текущую ситуацию, состояние персонажей, активные квесты.
Длина: не более 500 слов.
"""

            summary = await self.generate_response(
                prompt=prompt,
                system_prompt="Ты сокращаешь игровой контекст, сохраняя ключевую информацию.",
                temperature=0.3
            )

            return summary or long_context[:self.max_context_length]

        except Exception as e:
            logger.error(f"Error summarizing context: {e}")
            return long_context[:self.max_context_length]

    async def close(self):
        """Закрыть HTTP клиент"""
        await self.client.aclose()


# Глобальный экземпляр AI сервиса
ai_service = AIService()