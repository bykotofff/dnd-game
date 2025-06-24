// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Auth types
export interface User {
    id: string;
    username: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_verified: boolean;
    is_admin: boolean;
    games_played: number;
    total_playtime: number;
    preferences: UserPreferences;
    created_at: string;
    last_login?: string;
    last_seen?: string;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    sound_enabled: boolean;
    notifications_enabled: boolean;
    auto_roll_damage: boolean;
    show_advanced_options: boolean;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user_id: string;
    username: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    display_name?: string;
}

// Character types
export interface Character {
    id: string;
    name: string;
    race: string;
    character_class: string;
    subclass?: string;
    background?: string;
    alignment?: string;
    level: number;
    experience_points: number;

    // Abilities
    abilities: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };

    modifiers: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };

    // Combat stats
    hit_points: {
        max: number;
        current: number;
        temporary: number;
    };

    armor_class: number;
    proficiency_bonus: number;
    speed: number;

    // Skills and proficiencies
    saving_throws: Record<string, boolean>;
    skills: Record<string, SkillProficiency>;
    proficiencies: {
        armor: string[];
        weapons: string[];
        tools: string[];
        languages: string[];
    };

    // Equipment and spells
    inventory: Inventory;
    spells: SpellsData;
    features: Feature[];
    active_effects: Effect[];

    // Roleplay
    personality: {
        traits?: string;
        ideals?: string;
        bonds?: string;
        flaws?: string;
        backstory?: string;
    };

    appearance?: string;
    portrait_url?: string;
    is_alive: boolean;
    owner_id: string;
    created_at: string;
}

export interface SkillProficiency {
    proficient: boolean;
    expert: boolean;
}

export interface Inventory {
    items: Item[];
    equipment: Record<string, Item>;
    currency: {
        cp: number; // copper
        sp: number; // silver
        ep: number; // electrum
        gp: number; // gold
        pp: number; // platinum
    };
}

export interface Item {
    id: string;
    name: string;
    description?: string;
    type: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
    magical: boolean;
    quantity: number;
    weight: number;
    value: number; // in gold pieces
    properties?: string[];
}

export interface SpellsData {
    known: Spell[];
    prepared: string[]; // spell IDs
    slots: Record<string, { max: number; current: number }>;
}

export interface Spell {
    id: string;
    name: string;
    level: number;
    school: string;
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description: string;
    damage?: string;
    save?: string;
}

export interface Feature {
    id: string;
    name: string;
    description: string;
    source: string; // class, race, background, etc.
    uses?: {
        max: number;
        current: number;
        reset_on: 'short_rest' | 'long_rest' | 'dawn' | 'manual';
    };
}

export interface Effect {
    id: string;
    name: string;
    description: string;
    duration: number; // in rounds, -1 for permanent
    source: string;
    beneficial: boolean;
}

// Campaign types
export interface Campaign {
    id: string;
    name: string;
    description?: string;
    setting?: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
    creator_id: string;

    players: {
        current: number;
        max: number;
        list: string[];
    };

    world: {
        description?: string;
        locations_count: number;
        npcs_count: number;
        quests_count: number;
    };

    story: {
        main_story?: string;
        progress: Record<string, any>;
        events_count: number;
    };

    settings: CampaignSettings;
    ai_settings: {
        personality?: string;
        style: 'serious' | 'humorous' | 'dramatic' | 'balanced';
    };

    statistics: {
        total_sessions: number;
        total_playtime: number;
    };

    is_public: boolean;
    requires_approval: boolean;
    starting_level: number;
    house_rules?: string;
    created_at: string;
    updated_at: string;
}

export interface CampaignSettings {
    allow_homebrew: boolean;
    milestone_leveling: boolean;
    starting_gold: string;
    ability_score_generation: string;
    death_saves: boolean;
    pvp_allowed: boolean;
    resurrection_rules: string;
}

// Game types
export interface Game {
    id: string;
    name: string;
    description?: string;
    status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
    campaign_id: string;

    players: {
        current: number;
        max: number;
        list: string[];
    };

    characters: string[];
    current_scene?: string;

    turn_info: {
        turn: number;
        current_player_index: number;
        current_player_id?: string;
    };

    settings: GameSettings;

    statistics: {
        session_duration: number;
        messages_count: number;
        dice_rolls_count: number;
    };

    created_at: string;
    updated_at: string;
}

export interface GameSettings {
    dice_rolling: 'manual' | 'auto' | 'dm_only';
    character_sheets_visible: boolean;
    allow_pvp: boolean;
    death_saves: boolean;
    milestone_leveling: boolean;
}

// Message types for WebSocket
export interface GameMessage {
    id: string;
    game_id: string;
    sender: {
        id?: string;
        type: 'player' | 'dm' | 'system' | 'ai';
        name?: string;
    };
    message_type: 'text' | 'action' | 'dice_roll' | 'system';
    content: string;
    character_id?: string;
    is_ooc: boolean; // out of character
    is_whisper: boolean;
    whisper_target?: string;
    dice_data?: DiceRollData;
    timestamp: string;
}

export interface DiceRollData {
    notation: string;
    result: number;
    individual_rolls: number[];
    modifiers: Record<string, number>;
    purpose?: string;
    is_critical: boolean;
    is_advantage: boolean;
    is_disadvantage: boolean;
}

export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: string;
}

// Dice types
export interface DiceRoll {
    notation: string;
    result: number;
    individual_rolls: number[];
    modifiers: Record<string, number>;
    purpose?: string;
    advantage?: boolean;
    disadvantage?: boolean;
    critical?: boolean;
}

// UI State types
export interface UIState {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    loading: boolean;
    error: string | null;
    notifications: Notification[];
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    timestamp: string;
}