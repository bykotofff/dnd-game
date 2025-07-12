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
        """Получить системный промпт для Данжеон Мастера (ВАШ ОРИГИНАЛЬНЫЙ ПРОМПТ)"""
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

    # ✅ НОВЫЙ МЕТОД: Анализ действий с учетом полных данных персонажа
    async def analyze_player_action_with_character(
            self,
            action: str,
            character_data: Dict[str, Any],
            game_context: Dict[str, Any],
            party_data: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Анализировать действие игрока с учетом полных данных персонажа
        """
        try:
            # Формируем детальный промпт с данными персонажа
            char_name = character_data.get('name', 'Неизвестный')
            char_class = character_data.get('character_class', character_data.get('class', 'Неизвестный'))
            char_level = character_data.get('level', 1)
            char_race = character_data.get('race', 'Неизвестная')

            # Получаем характеристики (из разных возможных форматов)
            abilities = character_data.get('abilities', {})
            if not abilities:
                # Альтернативный формат - прямо в character_data
                abilities = {
                    'strength': character_data.get('strength', 10),
                    'dexterity': character_data.get('dexterity', 10),
                    'constitution': character_data.get('constitution', 10),
                    'intelligence': character_data.get('intelligence', 10),
                    'wisdom': character_data.get('wisdom', 10),
                    'charisma': character_data.get('charisma', 10)
                }

            # Получаем навыки
            skills = character_data.get('skills', {})

            # Строим описание персонажа
            char_description = f"{char_name} - {char_race} {char_class} {char_level} уровня"

            # Добавляем характеристики
            abilities_text = []
            for ability, value in abilities.items():
                if value is not None:
                    modifier = (int(value) - 10) // 2
                    mod_str = f"+{modifier}" if modifier >= 0 else str(modifier)
                    ability_name = {
                        'strength': 'Сила',
                        'dexterity': 'Ловкость',
                        'constitution': 'Телосложение',
                        'intelligence': 'Интеллект',
                        'wisdom': 'Мудрость',
                        'charisma': 'Харизма'
                    }.get(ability, ability.title())
                    abilities_text.append(f"{ability_name}: {value} ({mod_str})")

            if abilities_text:
                char_description += f"\nХарактеристики: {', '.join(abilities_text)}"

            # Добавляем владения навыками
            if skills:
                skilled_in = [skill for skill, proficient in skills.items() if proficient]
                if skilled_in:
                    char_description += f"\nВладеет навыками: {', '.join(skilled_in)}"

            # Формируем контекст сцены
            scene_context = game_context.get('current_scene', 'Неопределенная локация')
            party_size = len(party_data) if party_data else 1

            # УЛУЧШЕННЫЙ ПРОМПТ с сохранением вашего стиля
            prompt = f"""
Проанализируй действие игрока в D&D 5e с учетом его персонажа:

ПЕРСОНАЖ:
{char_description}

ДЕЙСТВИЕ: {action}

КОНТЕКСТ:
- Сцена: {scene_context}
- Размер группы: {party_size}
- Игра: {game_context.get('game_name', 'Неизвестная игра')}

Определи, нужна ли проверка кубиками, учитывая способности персонажа.

Ответь в формате JSON:
{{
  "нужен_бросок": "да/нет",
  "тип_броска": "атака/проверка_навыка/спасбросок/инициатива",
  "характеристика_или_навык": "название характеристики или навыка",
  "предполагаемый_DC": "число от 5 до 25",
  "преимущество_или_помеха": "преимущество/помеха/обычно",
  "объяснение": "краткое объяснение почему нужна/не нужна проверка"
}}

Учитывай:
- Класс персонажа и его особенности
- Значения характеристик
- Владение навыками
- Сложность действия
- Контекст ситуации
"""

            system_prompt = """Ты опытный ДМ D&D 5e. Анализируй действия игроков точно по правилам. 
Учитывай особенности классов, значения характеристик и владения навыками при определении сложности проверок."""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2
            )

            if response:
                try:
                    # Извлекаем JSON из ответа
                    json_start = response.find('{')
                    json_end = response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = response[json_start:json_end]
                        parsed = json.loads(json_str)

                        # Конвертируем результат
                        result = {
                            "requires_roll": parsed.get("нужен_бросок", "нет").lower() == "да",
                            "roll_type": parsed.get("тип_броска", ""),
                            "ability_or_skill": parsed.get("характеристика_или_навык", ""),
                            "suggested_dc": str(parsed.get("предполагаемый_DC", "15")),
                            "advantage_disadvantage": parsed.get("преимущество_или_помеха", "обычно"),
                            "explanation": parsed.get("объяснение", ""),
                            "character_context": {
                                "name": char_name,
                                "class": char_class,
                                "level": char_level,
                                "relevant_ability": parsed.get("характеристика_или_навык", ""),
                                "modifier": self._calculate_modifier(character_data, parsed.get("характеристика_или_навык", ""))
                            }
                        }
                        return result

                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse AI character analysis: {response}")

            # Fallback анализ на основе ключевых слов
            return self._fallback_character_analysis(action, character_data)

        except Exception as e:
            logger.error(f"Error in character-aware action analysis: {e}")
            return self._fallback_character_analysis(action, character_data)

    def _calculate_modifier(self, character_data: Dict[str, Any], ability_or_skill: str) -> int:
        """
        Вычислить модификатор для характеристики или навыка
        """
        try:
            # Получаем характеристики из разных возможных форматов
            abilities = character_data.get('abilities', {})
            if not abilities:
                abilities = {
                    'strength': character_data.get('strength', 10),
                    'dexterity': character_data.get('dexterity', 10),
                    'constitution': character_data.get('constitution', 10),
                    'intelligence': character_data.get('intelligence', 10),
                    'wisdom': character_data.get('wisdom', 10),
                    'charisma': character_data.get('charisma', 10)
                }

            skills = character_data.get('skills', {})
            level = character_data.get('level', 1)

            # Базовый бонус мастерства по уровню
            proficiency_bonus = 2 + ((level - 1) // 4)

            # Маппинг навыков к характеристикам
            skill_to_ability = {
                "акробатика": "dexterity",
                "обращение_с_животными": "wisdom",
                "магия": "intelligence",
                "атлетика": "strength",
                "обман": "charisma",
                "история": "intelligence",
                "проницательность": "wisdom",
                "запугивание": "charisma",
                "расследование": "intelligence",
                "медицина": "wisdom",
                "природа": "intelligence",
                "восприятие": "wisdom",
                "выступление": "charisma",
                "убеждение": "charisma",
                "религия": "intelligence",
                "ловкость_рук": "dexterity",
                "скрытность": "dexterity",
                "выживание": "wisdom",
                "acrobatics": "dexterity",
                "animal_handling": "wisdom",
                "arcana": "intelligence",
                "athletics": "strength",
                "deception": "charisma",
                "history": "intelligence",
                "insight": "wisdom",
                "intimidation": "charisma",
                "investigation": "intelligence",
                "medicine": "wisdom",
                "nature": "intelligence",
                "perception": "wisdom",
                "performance": "charisma",
                "persuasion": "charisma",
                "religion": "intelligence",
                "sleight_of_hand": "dexterity",
                "stealth": "dexterity",
                "survival": "wisdom"
            }

            # Если это основная характеристика
            ability_lower = ability_or_skill.lower()
            if ability_lower in abilities:
                ability_score = abilities.get(ability_lower, 10)
                return (int(ability_score) - 10) // 2

            # Если это навык
            if ability_lower in skill_to_ability:
                # Находим базовую характеристику для навыка
                base_ability = skill_to_ability[ability_lower]
                ability_score = abilities.get(base_ability, 10)
                ability_modifier = (int(ability_score) - 10) // 2

                # Проверяем владение навыком
                is_proficient = skills.get(ability_lower, False)
                proficiency = proficiency_bonus if is_proficient else 0

                return ability_modifier + proficiency

            # Если не можем определить, возвращаем 0
            return 0

        except Exception as e:
            logger.error(f"Error calculating modifier for {ability_or_skill}: {e}")
            return 0

    def _fallback_character_analysis(self, action: str, character_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Простой анализ действия без ИИ, но с учетом персонажа
        """
        action_lower = action.lower()
        char_class = character_data.get('character_class', character_data.get('class', '')).lower()
        char_level = character_data.get('level', 1)

        # Определяем нужен ли бросок по ключевым словам
        combat_keywords = ['атак', 'удар', 'стрел', 'руб', 'кол']
        stealth_keywords = ['скрыв', 'крад', 'тих', 'незамет']
        social_keywords = ['убежд', 'обман', 'запугив', 'перегов']
        magic_keywords = ['заклин', 'магия', 'закл', 'чар']
        skill_keywords = ['лаз', 'прыг', 'плав', 'ищ', 'слуш', 'смотр']

        # Базовый DC в зависимости от уровня и класса
        base_dc = 12 if char_level >= 5 else 15 if char_level >= 10 else 13

        if any(word in action_lower for word in combat_keywords):
            return {
                "requires_roll": True,
                "roll_type": "атака",
                "ability_or_skill": "сила" if char_class in ['fighter', 'barbarian'] else "ловкость",
                "suggested_dc": str(base_dc),
                "advantage_disadvantage": "обычно",
                "explanation": f"Атака требует броска атаки для {character_data.get('name', 'персонажа')}"
            }

        elif any(word in action_lower for word in stealth_keywords):
            return {
                "requires_roll": True,
                "roll_type": "проверка_навыка",
                "ability_or_skill": "скрытность",
                "suggested_dc": str(base_dc),
                "advantage_disadvantage": "преимущество" if char_class == 'rogue' else "обычно",
                "explanation": f"Скрытность требует проверки для {character_data.get('name', 'персонажа')}"
            }

        elif any(word in action_lower for word in social_keywords):
            social_skill = "убеждение" if "убежд" in action_lower else "обман" if "обман" in action_lower else "запугивание"
            return {
                "requires_roll": True,
                "roll_type": "проверка_навыка",
                "ability_or_skill": social_skill,
                "suggested_dc": str(base_dc),
                "advantage_disadvantage": "преимущество" if char_class in ['bard', 'sorcerer', 'warlock'] else "обычно",
                "explanation": f"Социальное взаимодействие требует проверки {social_skill}"
            }

        elif any(word in action_lower for word in magic_keywords):
            return {
                "requires_roll": True,
                "roll_type": "проверка_навыка",
                "ability_or_skill": "магия",
                "suggested_dc": str(base_dc),
                "advantage_disadvantage": "преимущество" if char_class in ['wizard', 'sorcerer', 'warlock'] else "обычно",
                "explanation": f"Использование магии требует проверки для {character_data.get('name', 'персонажа')}"
            }

        elif any(word in action_lower for word in skill_keywords):
            # Определяем навык по контексту
            if any(word in action_lower for word in ['лаз', 'прыг']):
                skill = "атлетика"
            elif any(word in action_lower for word in ['ищ', 'смотр']):
                skill = "восприятие"
            else:
                skill = "выживание"

            return {
                "requires_roll": True,
                "roll_type": "проверка_навыка",
                "ability_or_skill": skill,
                "suggested_dc": str(base_dc),
                "advantage_disadvantage": "обычно",
                "explanation": f"Действие требует проверки навыка {skill}"
            }

        # Если ничего не подходит - бросок не нужен
        return {
            "requires_roll": False,
            "roll_type": "",
            "ability_or_skill": "",
            "suggested_dc": "",
            "advantage_disadvantage": "обычно",
            "explanation": f"Простое действие для {character_data.get('name', 'персонажа')} не требует проверки"
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
        Генерировать ответ Данжеон Мастера (ВАША ОРИГИНАЛЬНАЯ ФУНКЦИЯ)
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

            # Формируем промпт для действия игрока (ВАШ ОРИГИНАЛЬНЫЙ ПРОМПТ)
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
            logger.error(f"Error generating DM response: {e}")
            return None

    # ✅ НОВЫЙ МЕТОД: Генерация ответов с учетом персонажа
    async def generate_character_aware_response(
            self,
            player_action: str,
            character_data: Dict[str, Any],
            game_context: Dict[str, Any],
            party_data: List[Dict[str, Any]] = None,
            recent_messages: List[str] = None
    ) -> str:
        """
        Генерировать ответ ДМ с учетом данных персонажа
        """
        try:
            char_name = character_data.get('name', 'Неизвестный')
            char_class = character_data.get('character_class', character_data.get('class', 'Неизвестный'))
            char_level = character_data.get('level', 1)
            char_background = character_data.get('background', '')

            # Формируем контекст персонажа
            hit_points = character_data.get('hit_points', {})
            if not hit_points:
                hit_points = {
                    'current': character_data.get('current_hit_points', '?'),
                    'max': character_data.get('max_hit_points', '?')
                }

            character_context = f"""
АКТИВНЫЙ ПЕРСОНАЖ:
- Имя: {char_name}
- Класс: {char_class} ({char_level} уровень)
- Предыстория: {char_background or 'Неизвестна'}
- HP: {hit_points.get('current', '?')}/{hit_points.get('max', '?')}
- AC: {character_data.get('armor_class', '?')}
"""

            # Добавляем информацию о партии
            party_context = ""
            if party_data and len(party_data) > 1:
                party_context = "\nПАРТИЯ:\n"
                for member in party_data:
                    if member.get('name') != char_name:  # Исключаем текущего персонажа
                        party_context += f"- {member.get('name', 'Неизвестный')} ({member.get('character_class', member.get('class', 'Неизвестный'))})\n"

            # Формируем полный промпт (СОХРАНЯЯ ВАШ СТИЛЬ)
            prompt = f"""
{character_context}
{party_context}

ТЕКУЩАЯ СЦЕНА: {game_context.get('current_scene', 'Неопределенная локация')}

ДЕЙСТВИЕ ИГРОКА: {char_name} {player_action}

Ответь как опытный Данжеон Мастер:
1. Опиши результат действия с учетом способностей персонажа
2. Создай атмосферное повествование
3. Учти особенности класса {char_class}
4. Заверши вопросом "Что вы делаете?"

Будь кратким но ярким. Не предлагай конкретные варианты действий.
"""

            system_prompt = self._get_dm_system_prompt()

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.7
            )

            if response:
                return response.strip()

            # Fallback ответ
            return f"*{char_name} выполняет действие: {player_action}*\n\nЧто вы делаете дальше?"

        except Exception as e:
            logger.error(f"Error generating character-aware response: {e}")
            return f"*{character_data.get('name', 'Персонаж')} действует.*\n\nПродолжайте игру!"

    # ✅ НОВЫЙ МЕТОД: Ответ на результат броска
    async def generate_dice_result_response(
            self,
            action: str,
            roll_result: Dict[str, Any],
            dc: int,
            character_name: str,
            game_context: Dict[str, Any] = None
    ) -> str:
        """
        Генерировать ответ на результат броска кубика
        """
        try:
            base_roll = roll_result.get('base_roll', 0)
            modifier = roll_result.get('modifier', 0)
            total = roll_result.get('total', 0)
            success = roll_result.get('success', False)
            skill = roll_result.get('skill', 'навык')

            # Формируем описание броска
            modifier_text = f"+{modifier}" if modifier > 0 else str(modifier) if modifier < 0 else ""
            roll_description = f"[{base_roll}{modifier_text} = {total}]"

            # Определяем степень успеха/провала
            if success:
                if total >= dc + 10:
                    success_level = "блестящий успех"
                elif total >= dc + 5:
                    success_level = "отличный результат"
                else:
                    success_level = "успех"
            else:
                if total <= dc - 10:
                    success_level = "критический провал"
                elif total <= dc - 5:
                    success_level = "серьезная неудача"
                else:
                    success_level = "неудача"

            # Особые случаи для критических бросков
            if base_roll == 20:
                success_level = "критический успех"
            elif base_roll == 1:
                success_level = "критический провал"

            # ПРОМПТ с сохранением вашего стиля
            prompt = f"""
Персонаж {character_name} выполняет действие: {action}

РЕЗУЛЬТАТ БРОСКА:
- Проверка: {skill}
- Бросок: {roll_description}
- Сложность: DC {dc}
- Результат: {success_level}

Контекст: {game_context.get('current_scene', 'Игровая сцена') if game_context else 'Игровая сцена'}

Опиши результат этой проверки ярко и кинематографично как опытный Данжеон Мастер:

1. Начни с результата броска в квадратных скобках: {roll_description}
2. Опиши КАК именно действие удается или не удается
3. Сделай повествование атмосферным и захватывающим
4. Покажи последствия действия
5. Закончи вопросом "Что вы делаете?"

ВАЖНО:
- Критические успехи (20) должны быть впечатляющими
- Критические провалы (1) должны быть интересными, не просто наказанием
- Даже неудачи должны продвигать историю вперед
- НЕ раскрывай конкретные цифры DC или точные значения сложности
"""

            system_prompt = """Ты - опытный Данжеон Мастер в D&D 5e. Ты интерпретируешь результаты бросков костей и создаешь живое повествование.

ПРИНЦИПЫ ХОРОШЕГО МАСТЕРСТВА:
- Результат броска священен - не игнорируй кости
- Создавай яркие, кинематографичные описания
- Показывай, не рассказывай
- Задействуй все чувства
- Пиши от второго лица ("вы", "ваш персонаж")

Отвечай ТОЛЬКО на русском языке!"""

            response = await self.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.8
            )

            if response:
                return response.strip()

            # Fallback ответ
            result_emoji = "🎯" if success else "❌"
            result_word = "успешно выполняет" if success else "терпит неудачу в попытке"

            return f"{result_emoji} {roll_description}\n\n**{character_name}** {result_word} {action}.\n\nЧто вы делаете дальше?"

        except Exception as e:
            logger.error(f"Error generating dice result response: {e}")
            # Минимальный fallback
            result_word = "действует" if roll_result.get('success', False) else "пытается действовать"
            return f"**{character_name}** {result_word}.\n\nПродолжайте игру!"

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