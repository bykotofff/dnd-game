// types/index.ts - Обновленные типы для совместимости

// User types
export interface User {
    id: string;
    username: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    created_at: string;
}

// Character types
export interface Character {
    id: string;
    name: string;
    race: string;
    character_class: string;
    level: number;
    hit_points: {
        current: number;
        max: number;
        temporary: number;
    };
    armor_class: number;
    abilities: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    skills?: Record<string, number>;
    equipment?: string[];
    spells?: string[];
    notes?: string;
    background?: string;
    alignment?: string;
    experience_points?: number;
}

// Campaign types
export interface Campaign {
    id: string;
    name: string;
    description?: string;
    setting?: string;
    status: 'planning' | 'active' | 'waiting' | 'on_hold' | 'completed' | 'archived';
    creator_id: string;
    current_players: number;
    max_players: number;
    starting_level: number;
    is_public: boolean;
    created_at: string;
}

// Detailed campaign info (from backend campaign.get_campaign_info())
export interface CampaignDetail extends Campaign {
    world_description?: string;
    main_story?: string;
    house_rules?: string;
    settings?: CampaignSettings;
    ai_personality?: string;
    ai_style: 'serious' | 'humorous' | 'dramatic' | 'balanced';
    requires_approval: boolean;
    players: string[]; // array of user IDs
}

// Campaign settings
export interface CampaignSettings {
    dice_rolling: {
        allow_advantage: boolean;
        critical_range: number;
        fumble_range: number;
    };
    combat: {
        initiative_tracking: boolean;
        auto_damage_calculation: boolean;
        death_saves_public: boolean;
    };
    exploration: {
        travel_time_tracking: boolean;
        resource_management: boolean;
        weather_effects: boolean;
    };
    social: {
        voice_chat_enabled: boolean;
        text_chat_moderation: boolean;
        player_notes_shared: boolean;
    };
    ai_dm: {
        personality_strength: number; // 1-5
        descriptive_detail: number; // 1-5
        challenge_level: number; // 1-5
        humor_level: number; // 1-5
        npcs_memory: boolean;
        world_consistency: boolean;
    };
}

// Game types
export interface Game {
    id: string;
    campaign_id: string;
    name: string;
    description?: string;
    status: 'waiting' | 'active' | 'paused' | 'completed';
    current_players: number;
    max_players: number;
    current_scene?: string;
    created_at: string;
}

// ✅ РАСШИРЕННЫЙ Game интерфейс для совместимости с GameDetailResponse
export interface GameDetail extends Game {
    players: string[]; // user IDs
    settings?: Record<string, any>;
    current_turn?: string;
    turn_number?: number;
    session_start?: string;
}

// Game session state
export interface GameSession {
    id: string;
    game_id: string;
    players: GamePlayer[];
    current_turn?: string; // player ID
    initiative_order: InitiativeEntry[];
    environment: {
        scene_description: string;
        weather?: string;
        lighting: 'bright' | 'dim' | 'dark';
        terrain_effects?: string[];
    };
    time: {
        in_game_date: string;
        session_duration: number; // in minutes
        turn_number: number;
    };
    ai_context: {
        recent_events: string[];
        active_npcs: string[];
        plot_threads: string[];
    };
}

// ✅ ОБНОВЛЕННЫЙ GamePlayer для совместимости
export interface GamePlayer {
    user_id: string;
    character_id: string;
    username: string;
    character_name: string;
    is_online: boolean;
    last_action?: string;
    initiative?: number;
    current_hp?: number;
    max_hp?: number;
    // ✅ Дополнительные поля для полной совместимости
    character?: Character;
    isCurrentTurn?: boolean;
}

// Initiative tracking
export interface InitiativeEntry {
    character_id: string;
    character_name: string;
    initiative: number;
    is_player: boolean;
    is_active: boolean;
}

// Dice rolling
export interface DiceRollData {
    notation: string;
    purpose?: string;
    character_id?: string;
    advantage?: boolean;
    disadvantage?: boolean;
}

export interface DiceRollResult {
    notation: string;
    total: number;
    individual_rolls: number[];
    modifiers: number;
    is_critical: boolean;
    is_fumble: boolean;
    purpose?: string;
    character_id?: string;
    advantage?: boolean;
    disadvantage?: boolean;
}

// Chat and messages
export interface GameMessage {
    id: string;
    type: 'chat' | 'action' | 'dice_roll' | 'system' | 'ai_dm' | 'ooc';
    content: string;
    sender: string;
    sender_id?: string;
    character_id?: string;
    timestamp: string;
    dice_roll?: DiceRollResult;
    is_whisper?: boolean;
    whisper_to?: string[];
    // ✅ Дополнительные поля
    game_id?: string;
    sender_name?: string;
    message_type?: string;
}

// AI Dungeon Master
export interface AiDmResponse {
    message: string;
    scene_description?: string;
    suggested_actions?: string[];
    requires_roll?: {
        type: string;
        dc: number;
        ability: string;
    };
    combat_update?: {
        initiative_order?: string[];
        current_turn?: string;
        round_number?: number;
    };
}

// Game effects and conditions
export interface GameEffect {
    id: string;
    name: string;
    description: string;
    duration: number; // rounds
    character_id: string;
    effect_type: 'buff' | 'debuff' | 'condition';
    modifiers: Record<string, number>;
}

// Location and environment
export interface GameLocation {
    id: string;
    name: string;
    description: string;
    map_url?: string;
    lighting: 'bright' | 'dim' | 'dark';
    terrain_type: string;
    special_rules?: string[];
}

// Items and inventory
export interface GameItem {
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable' | 'tool' | 'treasure';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
    value: number; // in gold pieces
    weight: number; // in pounds
    properties?: string[];
    charges?: number;
}

// Combat and encounters
export interface CombatEncounter {
    id: string;
    name: string;
    participants: InitiativeEntry[];
    current_round: number;
    current_turn_index: number;
    environment: GameLocation;
    special_conditions?: string[];
    treasure?: GameItem[];
}

// Game state management
export interface GameState {
    session_id: string;
    current_scene: string;
    active_players: GamePlayer[];
    current_turn?: string;
    turn_number: number;
    initiative_order: InitiativeEntry[];
    active_effects: GameEffect[];
    current_location: GameLocation;
    party_inventory: GameItem[];
    ai_context: string[];
    recent_events: string[];
}

// WebSocket message types
export interface WebSocketMessage {
    type: 'connected' | 'player_joined' | 'player_left' | 'chat_message' |
        'dice_roll' | 'game_state_update' | 'initiative_update' | 'error';
    data: any;
    timestamp: string;
}

// API response wrappers
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

// Form and validation types
export interface ValidationError {
    field: string;
    message: string;
}

export interface FormState {
    isSubmitting: boolean;
    errors: ValidationError[];
    touched: Record<string, boolean>;
}

// Theme and UI
export interface ThemeConfig {
    mode: 'light' | 'dark';
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
}

// User preferences
export interface UserPreferences {
    theme: ThemeConfig;
    notifications: {
        email: boolean;
        push: boolean;
        game_updates: boolean;
        chat_mentions: boolean;
    };
    accessibility: {
        high_contrast: boolean;
        large_text: boolean;
        screen_reader: boolean;
    };
    gameplay: {
        auto_roll_dice: boolean;
        show_roll_details: boolean;
        whisper_mode: boolean;
    };
}

// Export все основные типы
export default {
    User,
    Character,
    Campaign,
    CampaignDetail,
    Game,
    GameDetail,
    GamePlayer,
    GameMessage,
    DiceRollResult,
    InitiativeEntry,
    GameState,
    WebSocketMessage,
};