from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from .base import BaseModel


class Character(BaseModel):
    """
    Модель персонажа D&D
    """
    __tablename__ = "characters"

    # Связь с владельцем
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Основная информация
    name = Column(String(100), nullable=False)
    race = Column(String(50), nullable=False)  # Раса (Human, Elf, Dwarf, etc.)
    character_class = Column(String(50), nullable=False)  # Класс (Fighter, Wizard, etc.)
    subclass = Column(String(50), nullable=True)  # Подкласс
    background = Column(String(50), nullable=True)  # Предыстория
    alignment = Column(String(50), nullable=True)  # Мировоззрение

    # Уровень и опыт
    level = Column(Integer, default=1, nullable=False)
    experience_points = Column(Integer, default=0, nullable=False)

    # Основные характеристики (ability scores)
    strength = Column(Integer, default=10, nullable=False)
    dexterity = Column(Integer, default=10, nullable=False)
    constitution = Column(Integer, default=10, nullable=False)
    intelligence = Column(Integer, default=10, nullable=False)
    wisdom = Column(Integer, default=10, nullable=False)
    charisma = Column(Integer, default=10, nullable=False)

    # Очки жизни и защита
    max_hit_points = Column(Integer, default=1, nullable=False)
    current_hit_points = Column(Integer, default=1, nullable=False)
    temporary_hit_points = Column(Integer, default=0, nullable=False)
    armor_class = Column(Integer, default=10, nullable=False)

    # Бонус мастерства
    proficiency_bonus = Column(Integer, default=2, nullable=False)

    # Скорость
    speed = Column(Integer, default=30, nullable=False)

    # Спасброски
    saving_throws = Column(JSONB, default={}, nullable=False)

    # Навыки
    skills = Column(JSONB, default={}, nullable=False)

    # Владения
    proficiencies = Column(JSONB, default={
        "armor": [],
        "weapons": [],
        "tools": [],
        "languages": []
    }, nullable=False)

    # Инвентарь
    inventory = Column(JSONB, default={
        "items": [],
        "equipment": {},
        "currency": {"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}
    }, nullable=False)

    # Заклинания (для кастеров)
    spells = Column(JSONB, default={
        "known": [],
        "prepared": [],
        "slots": {}
    }, nullable=False)

    # Способности и черты
    features = Column(JSONB, default=[], nullable=False)

    # Активные эффекты (бафы/дебафы)
    active_effects = Column(JSONB, default=[], nullable=False)

    # Внешность и личность
    appearance = Column(Text, nullable=True)
    personality_traits = Column(Text, nullable=True)
    ideals = Column(Text, nullable=True)
    bonds = Column(Text, nullable=True)
    flaws = Column(Text, nullable=True)
    backstory = Column(Text, nullable=True)

    # Портрет (URL сгенерированного изображения)
    portrait_url = Column(String(500), nullable=True)

    # Статус
    is_active = Column(Boolean, default=True, nullable=False)
    is_alive = Column(Boolean, default=True, nullable=False)

    # Связи
    owner = relationship("User", back_populates="characters")

    def __repr__(self):
        return f"<Character(name='{self.name}', race='{self.race}', class='{self.character_class}', level={self.level})>"

    def get_ability_modifier(self, ability_score: int) -> int:
        """Получить модификатор характеристики"""
        if ability_score is None:
            ability_score = 10
        return (ability_score - 10) // 2

    def get_modifiers(self) -> dict:
        """Получить все модификаторы характеристик"""
        return {
            "strength": self.get_ability_modifier(getattr(self, 'strength', 10)),
            "dexterity": self.get_ability_modifier(getattr(self, 'dexterity', 10)),
            "constitution": self.get_ability_modifier(getattr(self, 'constitution', 10)),
            "intelligence": self.get_ability_modifier(getattr(self, 'intelligence', 10)),
            "wisdom": self.get_ability_modifier(getattr(self, 'wisdom', 10)),
            "charisma": self.get_ability_modifier(getattr(self, 'charisma', 10)),
        }

    def get_saving_throw_bonus(self, ability: str) -> int:
        """Получить бонус спасброска"""
        base_modifier = self.get_ability_modifier(getattr(self, ability))
        is_proficient = self.saving_throws.get(ability, False)
        proficiency = self.proficiency_bonus if is_proficient else 0
        return base_modifier + proficiency

    def get_skill_bonus(self, skill: str) -> int:
        """Получить бонус навыка"""
        # Маппинг навыков к характеристикам (упрощенный)
        skill_abilities = {
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

        ability = skill_abilities.get(skill, "strength")
        base_modifier = self.get_ability_modifier(getattr(self, ability))

        skill_data = self.skills.get(skill, {})
        is_proficient = skill_data.get("proficient", False)
        is_expert = skill_data.get("expert", False)

        proficiency = 0
        if is_expert:
            proficiency = self.proficiency_bonus * 2
        elif is_proficient:
            proficiency = self.proficiency_bonus

        return base_modifier + proficiency

    def calculate_max_hp(self) -> int:
        """Рассчитать максимальные очки жизни"""
        # Упрощенный расчет, в реальности зависит от класса и уровня
        constitution = getattr(self, 'constitution', 10) or 10
        level = getattr(self, 'level', 1) or 1
        con_modifier = self.get_ability_modifier(self.constitution)
        base_hp = 8 + con_modifier  # Предполагаем среднее значение
        level_hp = (self.level - 1) * (5 + con_modifier)  # Средний прирост за уровень
        return max(1, base_hp + level_hp)

    def take_damage(self, damage: int) -> dict:
        """Получить урон"""
        # Сначала убираем временные очки жизни
        if self.temporary_hit_points > 0:
            temp_damage = min(damage, self.temporary_hit_points)
            self.temporary_hit_points -= temp_damage
            damage -= temp_damage

        # Затем основные очки жизни
        self.current_hit_points = max(0, self.current_hit_points - damage)

        # Проверяем смерть
        if self.current_hit_points == 0:
            self.is_alive = False

        return {
            "damage_taken": damage,
            "current_hp": self.current_hit_points,
            "temp_hp": self.temporary_hit_points,
            "is_alive": self.is_alive
        }

    def heal(self, healing: int) -> dict:
        """Восстановить здоровье"""
        old_hp = self.current_hit_points
        self.current_hit_points = min(self.max_hit_points, self.current_hit_points + healing)

        if self.current_hit_points > 0:
            self.is_alive = True

        return {
            "healing_received": self.current_hit_points - old_hp,
            "current_hp": self.current_hit_points,
            "is_alive": self.is_alive
        }

    def get_character_sheet(self) -> dict:
        """Получить полный лист персонажа"""
        return {
            "id": str(self.id),
            "name": self.name,
            "race": self.race,
            "character_class": self.character_class,
            "subclass": self.subclass,
            "level": self.level,
            "experience_points": self.experience_points,
            "abilities": {
                "strength": self.strength,
                "dexterity": self.dexterity,
                "constitution": self.constitution,
                "intelligence": self.intelligence,
                "wisdom": self.wisdom,
                "charisma": self.charisma,
            },
            "modifiers": self.get_modifiers(),
            "hit_points": {
                "max": self.max_hit_points,
                "current": self.current_hit_points,
                "temporary": self.temporary_hit_points,
            },
            "armor_class": self.armor_class,
            "proficiency_bonus": self.proficiency_bonus,
            "speed": self.speed,
            "saving_throws": self.saving_throws,
            "skills": self.skills,
            "proficiencies": self.proficiencies,
            "inventory": self.inventory,
            "spells": self.spells,
            "features": self.features,
            "active_effects": self.active_effects,
            "appearance": self.appearance,
            "personality": {
                "traits": self.personality_traits,
                "ideals": self.ideals,
                "bonds": self.bonds,
                "flaws": self.flaws,
                "backstory": self.backstory,
            },
            "portrait_url": self.portrait_url,
            "is_alive": self.is_alive,
        }