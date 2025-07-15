import { apiService } from './api';
import type { CharacterResponse } from '@/types/';

// Интерфейсы для создания и обновления персонажей
export interface CreateCharacterData {
    name: string;
    race: string;
    character_class: string;
    subclass?: string;
    background?: string;
    alignment?: string;

    // Характеристики
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;

    // Описание
    appearance?: string;
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
}

export interface UpdateCharacterData {
    name?: string;
    level?: number;
    experience_points?: number;

    // Характеристики
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;

    // HP и защита
    max_hit_points?: number;
    current_hit_points?: number;
    temporary_hit_points?: number;
    armor_class?: number;

    // Навыки и владения
    skills?: Record<string, boolean>;
    proficiencies?: Record<string, any>;

    // Инвентарь
    inventory?: Record<string, any>;

    // Заклинания
    spells?: Record<string, any>;

    // Способности и эффекты
    features?: Array<Record<string, any>>;
    active_effects?: Array<Record<string, any>>;

    // Описание
    appearance?: string;
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
}

// ✅ НОВЫЙ ИНТЕРФЕЙС для детального персонажа
export interface DetailedCharacterResponse extends CharacterResponse {
    // Расширенная информация о персонаже
    subclass?: string;
    alignment?: string;
    experience_points: number;

    // Подробные характеристики
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;

    // Боевые характеристики
    current_hit_points: number;
    max_hit_points: number;
    temporary_hit_points: number;
    armor_class: number;
    proficiency_bonus: number;
    speed: number;

    // Навыки и владения
    saving_throws: Record<string, boolean>;
    skills: Record<string, boolean>;
    proficiencies: {
        armor: string[];
        weapons: string[];
        tools: string[];
        languages: string[];
    };

    // Инвентарь
    inventory: {
        items: any[];
        equipment: Record<string, any>;
        currency: {
            cp: number;
            sp: number;
            ep: number;
            gp: number;
            pp: number;
        };
    };

    // Заклинания (для кастеров)
    spells: {
        known: any[];
        prepared: any[];
        slots: Record<string, number>;
    };

    // Способности и черты
    features: any[];
    active_effects: any[];

    // Внешность и личность
    appearance?: string;
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;

    // Портрет
    portrait_url?: string;

    // Статус
    is_active: boolean;
    is_alive: boolean;

    // Даты
    updated_at: string;
}

class CharacterService {
    // Создание персонажа
    async createCharacter(data: CreateCharacterData): Promise<CharacterResponse> {
        return apiService.post('/characters', data);
    }

    // Получить список персонажей пользователя
    async getCharacters(): Promise<CharacterResponse[]> {
        return apiService.get('/characters');
    }

    // Получить персонажа по ID с детальной информацией
    async getCharacter(characterId: string): Promise<DetailedCharacterResponse> {
        return apiService.get(`/characters/${characterId}`);
    }

    // Обновить персонажа
    async updateCharacter(characterId: string, data: UpdateCharacterData): Promise<DetailedCharacterResponse> {
        return apiService.put(`/characters/${characterId}`, data);
    }

    // Удалить персонажа
    async deleteCharacter(characterId: string): Promise<{ message: string }> {
        return apiService.delete(`/characters/${characterId}`);
    }

    // ✅ НОВЫЕ МЕТОДЫ для работы с играми

    // Получить персонажей доступных для игры (активных и живых)
    async getAvailableCharacters(): Promise<CharacterResponse[]> {
        const characters = await this.getCharacters();
        return characters.filter(char => char.is_alive);
    }

    // Получить персонажей подходящих для конкретной кампании
    async getCharactersForCampaign(campaignId: string, startingLevel?: number): Promise<CharacterResponse[]> {
        const characters = await this.getAvailableCharacters();

        // Фильтруем по уровню если указан начальный уровень кампании
        if (startingLevel) {
            return characters.filter(char =>
                char.level >= startingLevel - 1 && char.level <= startingLevel + 2
            );
        }

        return characters;
    }

    // ✅ НОВЫЕ МЕТОДЫ для работы с портретами

    // Генерировать портрет персонажа
    async generatePortrait(characterId: string, customPrompt?: string): Promise<{ portrait_url: string }> {
        return apiService.post(`/characters/${characterId}/generate-portrait`, {
            custom_prompt: customPrompt
        });
    }

    // Загрузить кастомный портрет
    async uploadPortrait(characterId: string, file: File): Promise<{ portrait_url: string }> {
        const formData = new FormData();
        formData.append('portrait', file);

        return apiService.postFormData(`/characters/${characterId}/upload-portrait`, formData);
    }

    // ✅ НОВЫЕ МЕТОДЫ для статистики и аналитики

    // Получить статистику персонажа
    async getCharacterStats(characterId: string): Promise<{
        games_played: number;
        total_playtime: number;
        dice_rolls_made: number;
        critical_hits: number;
        critical_fails: number;
        damage_dealt: number;
        damage_taken: number;
        healing_done: number;
        spells_cast: number;
        skills_used: Record<string, number>;
    }> {
        return apiService.get(`/characters/${characterId}/stats`);
    }

    // Получить историю персонажа в играх
    async getCharacterGameHistory(characterId: string): Promise<Array<{
        game_id: string;
        game_name: string;
        campaign_name: string;
        session_date: string;
        duration: number;
        level_gained: boolean;
        major_events: string[];
    }>> {
        return apiService.get(`/characters/${characterId}/game-history`);
    }

    // ✅ УТИЛИТАРНЫЕ МЕТОДЫ

    // Вычислить модификатор характеристики
    static getAbilityModifier(abilityScore: number): number {
        return Math.floor((abilityScore - 10) / 2);
    }

    // Форматировать модификатор для отображения
    static formatModifier(modifier: number): string {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    // Получить цвет для отображения здоровья
    static getHealthColor(current: number, max: number): 'green' | 'yellow' | 'orange' | 'red' {
        const percentage = (current / max) * 100;
        if (percentage > 75) return 'green';
        if (percentage > 50) return 'yellow';
        if (percentage > 25) return 'orange';
        return 'red';
    }

    // Получить иконку класса персонажа
    static getClassIcon(characterClass: string): string {
        const icons: Record<string, string> = {
            fighter: '⚔️',
            wizard: '🔮',
            rogue: '🗡️',
            cleric: '⛪',
            ranger: '🏹',
            paladin: '🛡️',
            barbarian: '⚡',
            bard: '🎵',
            druid: '🌿',
            monk: '👊',
            sorcerer: '✨',
            warlock: '👹',
        };
        return icons[characterClass.toLowerCase()] || '🧙';
    }

    // Проверить может ли персонаж участвовать в кампании
    static canCharacterJoinCampaign(
        character: CharacterResponse,
        campaignRequirements: {
            starting_level?: number;
            max_level?: number;
            allowed_races?: string[];
            allowed_classes?: string[];
            homebrew_allowed?: boolean;
        }
    ): { canJoin: boolean; reasons: string[] } {
        const reasons: string[] = [];

        // Проверка уровня
        if (campaignRequirements.starting_level && character.level < campaignRequirements.starting_level) {
            reasons.push(`Уровень персонажа (${character.level}) меньше требуемого (${campaignRequirements.starting_level})`);
        }

        if (campaignRequirements.max_level && character.level > campaignRequirements.max_level) {
            reasons.push(`Уровень персонажа (${character.level}) больше максимального (${campaignRequirements.max_level})`);
        }

        // Проверка расы
        if (campaignRequirements.allowed_races && !campaignRequirements.allowed_races.includes(character.race)) {
            reasons.push(`Раса "${character.race}" не разрешена в этой кампании`);
        }

        // Проверка класса
        if (campaignRequirements.allowed_classes && !campaignRequirements.allowed_classes.includes(character.character_class)) {
            reasons.push(`Класс "${character.character_class}" не разрешен в этой кампании`);
        }

        // Проверка статуса
        if (!character.is_alive) {
            reasons.push('Персонаж мертв');
        }

        return {
            canJoin: reasons.length === 0,
            reasons
        };
    }
}

// Экспорт синглтона
export const characterService = new CharacterService();
export default characterService;