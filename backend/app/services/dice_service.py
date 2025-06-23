import random
import re
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DiceResult:
    """Результат броска костей"""
    notation: str                # Нотация броска (например, "2d6+3")
    individual_rolls: List[int]  # Отдельные броски
    modifiers: Dict[str, int]    # Модификаторы
    total: int                   # Итоговый результат
    is_critical: bool = False    # Критический успех/провал
    is_advantage: bool = False   # Преимущество
    is_disadvantage: bool = False # Помеха

    def __str__(self):
        rolls_str = " + ".join(map(str, self.individual_rolls))
        mod_str = ""
        if self.modifiers:
            for name, value in self.modifiers.items():
                if value > 0:
                    mod_str += f" + {value} ({name})"
                elif value < 0:
                    mod_str += f" - {abs(value)} ({name})"

        result = f"{self.notation}: [{rolls_str}]{mod_str} = {self.total}"

        if self.is_critical:
            result += " (КРИТИЧЕСКИЙ!)"
        if self.is_advantage:
            result += " (преимущество)"
        if self.is_disadvantage:
            result += " (помеха)"

        return result


class DiceService:
    """
    Сервис для работы с бросками костей D&D
    """

    def __init__(self):
        # Регулярное выражение для парсинга нотации костей
        self.dice_pattern = re.compile(
            r'(?P<count>\d+)?d(?P<sides>\d+)(?P<modifier>[+-]\d+)?',
            re.IGNORECASE
        )

        # Стандартные кости D&D
        self.standard_dice = [4, 6, 8, 10, 12, 20, 100]

    def roll_dice(
            self,
            count: int,
            sides: int,
            modifier: int = 0,
            advantage: bool = False,
            disadvantage: bool = False,
            exploding: bool = False
    ) -> List[int]:
        """
        Бросить кости

        Args:
            count: Количество костей
            sides: Количество граней
            modifier: Модификатор (не применяется к отдельным броскам)
            advantage: Преимущество (для d20)
            disadvantage: Помеха (для d20)
            exploding: Взрывающиеся кости
        """
        if count <= 0 or sides <= 0:
            raise ValueError("Количество костей и граней должно быть положительным")

        if count > 100:  # Защита от слишком больших бросков
            raise ValueError("Слишком много костей (максимум 100)")

        rolls = []

        for _ in range(count):
            if advantage and sides == 20:
                # Преимущество: бросаем 2d20, берем лучший
                roll1 = random.randint(1, sides)
                roll2 = random.randint(1, sides)
                roll = max(roll1, roll2)
                rolls.append(roll)
            elif disadvantage and sides == 20:
                # Помеха: бросаем 2d20, берем худший
                roll1 = random.randint(1, sides)
                roll2 = random.randint(1, sides)
                roll = min(roll1, roll2)
                rolls.append(roll)
            else:
                roll = random.randint(1, sides)

                # Взрывающиеся кости
                if exploding and roll == sides:
                    total_roll = roll
                    while True:
                        extra_roll = random.randint(1, sides)
                        total_roll += extra_roll
                        if extra_roll != sides:
                            break
                    rolls.append(total_roll)
                else:
                    rolls.append(roll)

        return rolls

    def parse_dice_notation(self, notation: str) -> Dict[str, Any]:
        """
        Парсинг нотации костей (например, "2d6+3", "1d20", "d4-1")

        Returns:
            Dict с параметрами броска
        """
        notation = notation.strip().lower().replace(" ", "")

        # Обрабатываем специальные случаи
        if notation in ["d4", "d6", "d8", "d10", "d12", "d20", "d100"]:
            return {
                "count": 1,
                "sides": int(notation[1:]),
                "modifier": 0,
                "original": notation
            }

        match = self.dice_pattern.match(notation)
        if not match:
            raise ValueError(f"Неверная нотация костей: {notation}")

        count = int(match.group("count") or 1)
        sides = int(match.group("sides"))
        modifier_str = match.group("modifier") or "+0"
        modifier = int(modifier_str)

        return {
            "count": count,
            "sides": sides,
            "modifier": modifier,
            "original": notation
        }

    def roll_from_notation(
            self,
            notation: str,
            advantage: bool = False,
            disadvantage: bool = False,
            additional_modifiers: Dict[str, int] = None,
            exploding: bool = False
    ) -> DiceResult:
        """
        Бросок по нотации

        Args:
            notation: Нотация костей (например, "2d6+3")
            advantage: Преимущество
            disadvantage: Помеха
            additional_modifiers: Дополнительные модификаторы
            exploding: Взрывающиеся кости
        """
        try:
            params = self.parse_dice_notation(notation)

            # Проверяем конфликт преимущество/помеха
            if advantage and disadvantage:
                advantage = disadvantage = False

            # Бросаем кости
            rolls = self.roll_dice(
                count=params["count"],
                sides=params["sides"],
                advantage=advantage,
                disadvantage=disadvantage,
                exploding=exploding
            )

            # Собираем модификаторы
            modifiers = {}
            total_modifier = params["modifier"]

            if params["modifier"] != 0:
                modifiers["base"] = params["modifier"]

            if additional_modifiers:
                for name, value in additional_modifiers.items():
                    modifiers[name] = value
                    total_modifier += value

            # Вычисляем итоговый результат
            rolls_sum = sum(rolls)
            total = rolls_sum + total_modifier

            # Проверяем критический успех/провал (только для d20)
            is_critical = False
            if params["sides"] == 20 and params["count"] == 1:
                if rolls[0] == 20:
                    is_critical = True
                elif rolls[0] == 1:
                    is_critical = True

            return DiceResult(
                notation=notation,
                individual_rolls=rolls,
                modifiers=modifiers,
                total=total,
                is_critical=is_critical,
                is_advantage=advantage,
                is_disadvantage=disadvantage
            )

        except Exception as e:
            logger.error(f"Error rolling dice with notation {notation}: {e}")
            raise

    def roll_ability_check(
            self,
            ability_modifier: int,
            proficiency_bonus: int = 0,
            is_proficient: bool = False,
            is_expert: bool = False,
            advantage: bool = False,
            disadvantage: bool = False
    ) -> DiceResult:
        """
        Бросок проверки характеристики или навыка
        """
        modifiers = {}

        if ability_modifier != 0:
            modifiers["ability"] = ability_modifier

        if is_proficient or is_expert:
            prof_bonus = proficiency_bonus * (2 if is_expert else 1)
            modifiers["proficiency"] = prof_bonus

        return self.roll_from_notation(
            "1d20",
            advantage=advantage,
            disadvantage=disadvantage,
            additional_modifiers=modifiers
        )

    def roll_attack(
            self,
            attack_bonus: int,
            advantage: bool = False,
            disadvantage: bool = False
    ) -> DiceResult:
        """
        Бросок атаки
        """
        modifiers = {"attack_bonus": attack_bonus} if attack_bonus != 0 else {}

        return self.roll_from_notation(
            "1d20",
            advantage=advantage,
            disadvantage=disadvantage,
            additional_modifiers=modifiers
        )

    def roll_damage(
            self,
            damage_dice: str,
            damage_modifier: int = 0,
            critical: bool = False,
            additional_dice: str = None
    ) -> DiceResult:
        """
        Бросок урона

        Args:
            damage_dice: Основные кости урона (например, "1d8")
            damage_modifier: Модификатор урона
            critical: Критический удар (удваивает кости)
            additional_dice: Дополнительные кости (например, от заклинаний)
        """
        try:
            # Парсим основные кости урона
            main_params = self.parse_dice_notation(damage_dice)

            # Для критического удара удваиваем количество костей
            if critical:
                main_params["count"] *= 2

            # Бросаем основные кости
            main_rolls = self.roll_dice(
                count=main_params["count"],
                sides=main_params["sides"]
            )

            all_rolls = main_rolls
            modifiers = {}

            # Добавляем модификатор урона
            if damage_modifier != 0:
                modifiers["damage_modifier"] = damage_modifier

            # Добавляем дополнительные кости
            if additional_dice:
                try:
                    add_params = self.parse_dice_notation(additional_dice)
                    add_rolls = self.roll_dice(
                        count=add_params["count"],
                        sides=add_params["sides"]
                    )
                    all_rolls.extend(add_rolls)
                    modifiers["additional"] = sum(add_rolls)
                except:
                    logger.warning(f"Failed to parse additional dice: {additional_dice}")

            # Базовый модификатор из нотации
            if main_params["modifier"] != 0:
                modifiers["base"] = main_params["modifier"]

            total_modifier = sum(modifiers.values())
            total = sum(all_rolls) + total_modifier

            notation = damage_dice
            if critical:
                notation = f"CRIT {notation}"
            if additional_dice:
                notation += f" + {additional_dice}"

            return DiceResult(
                notation=notation,
                individual_rolls=all_rolls,
                modifiers=modifiers,
                total=total,
                is_critical=critical
            )

        except Exception as e:
            logger.error(f"Error rolling damage {damage_dice}: {e}")
            raise

    def roll_saving_throw(
            self,
            ability_modifier: int,
            proficiency_bonus: int = 0,
            is_proficient: bool = False,
            advantage: bool = False,
            disadvantage: bool = False,
            magic_bonus: int = 0
    ) -> DiceResult:
        """
        Бросок спасброска
        """
        modifiers = {}

        if ability_modifier != 0:
            modifiers["ability"] = ability_modifier

        if is_proficient:
            modifiers["proficiency"] = proficiency_bonus

        if magic_bonus != 0:
            modifiers["magic"] = magic_bonus

        return self.roll_from_notation(
            "1d20",
            advantage=advantage,
            disadvantage=disadvantage,
            additional_modifiers=modifiers
        )

    def roll_initiative(
            self,
            dexterity_modifier: int,
            initiative_bonus: int = 0
    ) -> DiceResult:
        """
        Бросок инициативы
        """
        modifiers = {}

        if dexterity_modifier != 0:
            modifiers["dexterity"] = dexterity_modifier

        if initiative_bonus != 0:
            modifiers["initiative_bonus"] = initiative_bonus

        return self.roll_from_notation(
            "1d20",
            additional_modifiers=modifiers
        )

    def roll_hit_die(
            self,
            hit_die: str,
            constitution_modifier: int = 0
    ) -> DiceResult:
        """
        Бросок кости жизни (восстановление HP)
        """
        modifiers = {}
        if constitution_modifier != 0:
            modifiers["constitution"] = constitution_modifier

        return self.roll_from_notation(
            hit_die,
            additional_modifiers=modifiers
        )

    def validate_dice_notation(self, notation: str) -> bool:
        """
        Проверить корректность нотации костей
        """
        try:
            self.parse_dice_notation(notation)
            return True
        except:
            return False

    def get_average_roll(self, notation: str) -> float:
        """
        Получить средний результат броска
        """
        try:
            params = self.parse_dice_notation(notation)
            average_die = (params["sides"] + 1) / 2
            average_total = params["count"] * average_die + params["modifier"]
            return average_total
        except:
            return 0.0


# Глобальный экземпляр сервиса костей
dice_service = DiceService()