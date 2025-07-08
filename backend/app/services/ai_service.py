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

            # Строим контекст игры
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

    async def generate_world_description(
            self,
            location_name: str,
            location_type: str = "generic",
            atmosphere: str = "neutral",
            details: Optional[str] = None
    ) -> Optional[str]:
        """
        Генерировать описание локации
        """
        try:
            prompt = f"""
Создай яркое описание локации для D&D игры:

Название: {location_name}
Тип локации: {location_type}
Атмосфера: {atmosphere}
Дополнительные детали: {details or 'Нет'}

Опиши: внешний вид, звуки, запахи, освещение, интересные детали. 
Сделай описание атмосферным и погружающим. Длина: 2-3 предложения.
"""

            system_prompt = """Ты - опытный Данжеон Мастер в D&D. Создавай живые, атмосферные описания локаций, которые помогают игрокам погрузиться в мир."""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.9
            )

            return response

        except Exception as e:
            logger.error(f"Error generating world description: {e}")
            return None

    async def generate_npc_dialogue(
            self,
            npc_name: str,
            npc_personality: str,
            player_message: str,
            context: Optional[str] = None
    ) -> Optional[str]:
        """
        Генерировать диалог НПС
        """
        try:
            prompt = f"""
НПС: {npc_name}
Личность: {npc_personality}
Контекст: {context or 'Обычный разговор'}

Игрок говорит: "{player_message}"

Ответь как этот НПС. Используй его личность и манеру речи.
"""

            system_prompt = """Ты играешь роли различных НПС в D&D. Отвечай в соответствии с личностью персонажа, создавай запоминающиеся диалоги."""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.8
            )

            return response

        except Exception as e:
            logger.error(f"Error generating NPC dialogue: {e}")
            return None

    async def generate_quest_description(
            self,
            quest_type: str,
            difficulty: str,
            location: str,
            reward_type: str = "standard"
    ) -> Optional[Dict[str, str]]:
        """
        Генерировать описание квеста
        """
        try:
            prompt = f"""
Создай квест для D&D:

Тип: {quest_type}
Сложность: {difficulty}  
Локация: {location}
Тип награды: {reward_type}

Создай:
1. Название квеста
2. Краткое описание (2-3 предложения)
3. Основную цель
4. Возможные препятствия
5. Предполагаемую награду

Формат ответа в JSON.
"""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt="Ты создаешь квесты для D&D. Делай их интересными и разнообразными.",
                temperature=0.8
            )

            # Пытаемся распарсить JSON
            try:
                return json.loads(response)
            except:
                # Если не JSON, возвращаем как текст
                return {"description": response}

        except Exception as e:
            logger.error(f"Error generating quest: {e}")
            return None

    async def analyze_player_action(
            self,
            action: str,
            character_data: Dict[str, Any],
            current_situation: str
    ) -> Dict[str, Any]:
        """
        Анализировать действие игрока и определить нужные броски
        """
        try:
            prompt = f"""
Действие игрока: {action}
Персонаж: {character_data.get('name')} ({character_data.get('class')})
Ситуация: {current_situation}

Проанализируй действие и определи:
1. Нужен ли бросок костей? (да/нет)
2. Если да, то какой тип броска? (skill_check/attack/saving_throw/ability_check)
3. Какая характеристика или навык? (например: athletics, perception, dexterity)
4. Предполагаемый DC (Difficulty Class) от 5 до 30
5. Есть ли преимущество или помеха?

Ответь в JSON формате.
"""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt="Ты анализируешь действия игроков в D&D и определяешь механику бросков по правилам 5e.",
                temperature=0.3  # Низкая температура для точности
            )

            try:
                return json.loads(response)
            except:
                return {
                    "requires_roll": False,
                    "roll_type": "none",
                    "ability_or_skill": None,
                    "dc": 10,
                    "advantage": False,
                    "disadvantage": False
                }

        except Exception as e:
            logger.error(f"Error analyzing player action: {e}")
            return {"requires_roll": False}

    def _get_dm_system_prompt(self) -> str:
        """Получить системный промпт для Данжеон Мастера"""
        return """Ты — опытный Мастер подземелий в D&D 5e. Твоя цель — создать увлекательное и честное приключение.

🎲 **МЕХАНИКА ИГРЫ:**
- Система уже автоматически анализирует действия игроков и определяет нужные проверки
- Когда игрок делает бросок, ты получаешь результат и должен интерпретировать его
- ВСЕГДА реагируй на броски костей и объясняй результат действия
- Используй результаты бросков для развития сюжета

📊 **ОБРАБОТКА БРОСКОВ:**
- Успех (DC достигнут): Действие выполняется полностью или частично успешно
- Провал (DC не достигнут): Действие не удается, но сюжет продолжается
- Критический успех (20): Превосходный результат с дополнительными преимуществами
- Критический провал (1): Неудача с осложнениями или комическими последствиями

🎭 **СТИЛЬ ПОВЕСТВОВАНИЯ:**
- Описывай результаты ярко и атмосферно
- Используй все 5 чувств: зрение, слух, запах, осязание, вкус
- Создавай напряжение и неожиданные повороты
- Балансируй между успехами и неудачами

🌟 **ПРИНЦИПЫ:**
1. **Честность**: Результаты бросков определяют исход, не игнорируй их
2. **Последствия**: Каждое действие имеет результат, влияющий на мир
3. **Выбор**: Всегда предлагай игрокам варианты действий
4. **Прогресс**: Даже неудачи должны двигать историю вперед

🎯 **ФОРМАТ ОТВЕТОВ:**
- Опиши результат действия на основе броска
- Добавь атмосферные детали
- Укажи последствия (положительные или отрицательные)
- Заверши вопросом: "Что вы делаете?" или предложи варианты

⚔️ **ПРИМЕРЫ РЕАКЦИЙ НА БРОСКИ:**
- Успешное восприятие (15+): "Ваш острый взгляд замечает..."
- Провал скрытности (10-): "Ваша нога наступает на сухую ветку..."
- Критический успех атаки (20): "Ваш удар находит уязвимое место..."
- Критический провал (1): "В самый неподходящий момент..."

Помни: ты не просто рассказчик, ты справедливый судья, который интерпретирует волю костей!"""


# Также добавьте этот улучшенный метод для обработки результатов проверок:

async def generate_dice_result_response(
        self,
        game_id: str,
        player_name: str,
        action: str,
        roll_result: int,
        dc: int,
        roll_type: str,
        ability_or_skill: str,
        game_context: Dict[str, Any]
) -> Optional[str]:
    """
    Генерировать ответ ИИ на результат проверки кубиками
    """
    try:
        success = roll_result >= dc
        margin = abs(roll_result - dc)

        # Определяем степень успеха/неудачи
        if roll_result == 20:
            outcome = "критический успех"
        elif roll_result == 1:
            outcome = "критический провал"
        elif success:
            if margin >= 10:
                outcome = "превосходный успех"
            elif margin >= 5:
                outcome = "хороший успех"
            else:
                outcome = "успех"
        else:
            if margin >= 10:
                outcome = "серьезная неудача"
            elif margin >= 5:
                outcome = "неудача"
            else:
                outcome = "едва не удалось"

        prompt = f"""
РЕЗУЛЬТАТ ПРОВЕРКИ КУБИКАМИ:

Игрок: {player_name}
Действие: {action}
Тип проверки: {roll_type} ({ability_or_skill})
Результат броска: {roll_result}
Сложность: {dc}
Исход: {outcome}

Контекст игры: {game_context.get('current_scene', 'Unknown location')}

Опиши результат этой проверки ярко и атмосферно. Покажи КАК действие удается или не удается. 
Добавь последствия и спроси что игроки делают дальше.

ВАЖНО: Основывайся ТОЧНО на результате броска. Не игнорируй кости!
"""

        system_prompt = self._get_dm_system_prompt()

        response = await self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.8  # Высокая креативность для ярких описаний
        )

        return response

    except Exception as e:
        logger.error(f"Error generating dice result response: {e}")
        return None

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