import { apiService } from './api';
import type { Character } from '@/types';

export interface CreateCharacterData {
    name: string;
    race: string;
    character_class: string;
    subclass?: string;
    background?: string;
    alignment?: string;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
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
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    max_hit_points?: number;
    current_hit_points?: number;
    temporary_hit_points?: number;
    armor_class?: number;
    skills?: Record<string, any>;
    proficiencies?: Record<string, any>;
    inventory?: Record<string, any>;
    spells?: Record<string, any>;
    features?: Array<Record<string, any>>;
    active_effects?: Array<Record<string, any>>;
    appearance?: string;
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
}

export interface CharacterListItem {
    id: string;
    name: string;
    race: string;
    character_class: string;
    level: number;
    owner_id: string;
    is_alive: boolean;
    created_at: string;
}

class CharacterService {
    // Get all user's characters
    async getCharacters(activeOnly: boolean = true): Promise<CharacterListItem[]> {
        return apiService.get('/characters', { active_only: activeOnly });
    }

    // Get character by ID
    async getCharacter(characterId: string): Promise<Character> {
        return apiService.get(`/characters/${characterId}`);
    }

    // Create new character
    async createCharacter(data: CreateCharacterData): Promise<CharacterListItem> {
        return apiService.post('/characters', data);
    }

    // Update character
    async updateCharacter(characterId: string, data: UpdateCharacterData): Promise<Character> {
        return apiService.put(`/characters/${characterId}`, data);
    }

    // Delete character (soft delete)
    async deleteCharacter(characterId: string): Promise<{ message: string }> {
        return apiService.delete(`/characters/${characterId}`);
    }

    // Take damage
    async takeDamage(characterId: string, damage: number): Promise<{
        message: string;
        result: {
            damage_taken: number;
            current_hp: number;
            temp_hp: number;
            is_alive: boolean;
        };
        character_status: {
            current_hp: number;
            max_hp: number;
            is_alive: boolean;
        };
    }> {
        return apiService.post(`/characters/${characterId}/damage`, { damage });
    }

    // Heal character
    async healCharacter(characterId: string, healing: number): Promise<{
        message: string;
        result: {
            healing_received: number;
            current_hp: number;
            is_alive: boolean;
        };
        character_status: {
            current_hp: number;
            max_hp: number;
            is_alive: boolean;
        };
    }> {
        return apiService.post(`/characters/${characterId}/heal`, { healing });
    }

    // Generate character portrait
    async generatePortrait(
        characterId: string,
        customPrompt?: string
    ): Promise<{
        message: string;
        portrait_url: string;
        character_id: string;
    }> {
        return apiService.post(`/characters/${characterId}/portrait`, {
            custom_prompt: customPrompt,
        });
    }

    // Helper methods for character sheet calculations
    getAbilityModifier(score: number): number {
        return Math.floor((score - 10) / 2);
    }

    getProficiencyBonus(level: number): number {
        return Math.ceil(level / 4) + 1;
    }

    getSavingThrowBonus(
        abilityScore: number,
        isProficient: boolean,
        proficiencyBonus: number
    ): number {
        const modifier = this.getAbilityModifier(abilityScore);
        return modifier + (isProficient ? proficiencyBonus : 0);
    }

    getSkillBonus(
        abilityScore: number,
        isProficient: boolean,
        isExpert: boolean,
        proficiencyBonus: number
    ): number {
        const modifier = this.getAbilityModifier(abilityScore);
        let proficiencyMultiplier = 0;

        if (isExpert) proficiencyMultiplier = 2;
        else if (isProficient) proficiencyMultiplier = 1;

        return modifier + (proficiencyBonus * proficiencyMultiplier);
    }

    // Character validation helpers
    isValidCharacterName(name: string): boolean {
        return name.length >= 2 && name.length <= 50;
    }

    isValidAbilityScore(score: number): boolean {
        return score >= 1 && score <= 30;
    }

    areValidAbilityScores(scores: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    }): boolean {
        return Object.values(scores).every(score => this.isValidAbilityScore(score));
    }

    // Calculate total ability score points (for point buy validation)
    calculatePointBuyCost(scores: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    }): number {
        const pointCosts: Record<number, number> = {
            8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5,
            14: 7, 15: 9,
        };

        return Object.values(scores).reduce((total, score) => {
            return total + (pointCosts[score] || 0);
        }, 0);
    }

    // Character sheet export/import helpers
    exportCharacterSheet(character: Character): string {
        return JSON.stringify(character, null, 2);
    }

    validateImportedCharacter(data: any): boolean {
        try {
            return !!(
                data.name &&
                data.race &&
                data.character_class &&
                data.abilities &&
                this.areValidAbilityScores(data.abilities)
            );
        } catch {
            return false;
        }
    }
}

export const characterService = new CharacterService();
export default characterService;