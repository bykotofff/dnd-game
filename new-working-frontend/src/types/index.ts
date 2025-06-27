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

// Дополнения к frontend/src/types/index.ts для типов кампаний

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

export interface GamePlayer {
    user_id: string;
    character_id: string;
    username: string;
    character_name: string;
    is_online: boolean;
    last_action?: string;
    initiative?: number;
}

export interface InitiativeEntry {
    character_id: string;
    character_name: string;
    initiative: number;
    is_player: boolean;
    is_active: boolean;
}

// Chat and messaging
export interface ChatMessage {
    id: string;
    game_id: string;
    sender_id: string;
    sender_name: string;
    message_type: 'chat' | 'action' | 'roll' | 'system' | 'ai_dm';
    content: string;
    timestamp: string;
    dice_roll?: DiceRollResult;
    is_whisper?: boolean;
    whisper_to?: string[];
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
}

// AI DM types
export interface AiResponse {
    message: string;
    context_updates?: {
        scene_description?: string;
        npc_actions?: string[];
        world_state_changes?: string[];
    };
    suggested_actions?: string[];
    requires_player_input: boolean;
}

// WebSocket message types
export interface WebSocketGameMessage {
    type: 'chat' | 'action' | 'roll' | 'join' | 'leave' | 'initiative' | 'ai_response' | 'game_state_update';
    data: any;
    sender_id?: string;
    timestamp: string;
}

// Campaign creation/management forms
export interface CreateCampaignForm {
    name: string;
    description?: string;
    setting?: string;
    max_players: number;
    world_description?: string;
    main_story?: string;
    house_rules?: string;
    starting_level: number;
    ai_personality?: string;
    ai_style: 'serious' | 'humorous' | 'dramatic' | 'balanced';
    is_public: boolean;
    requires_approval: boolean;
    settings?: Partial<CampaignSettings>;
}

export interface JoinCampaignRequest {
    character_id: string;
    message?: string; // optional message to DM if approval required
}

// Campaign list filters
export interface CampaignFilters {
    status?: 'planning' | 'active' | 'waiting' | 'on_hold' | 'completed' | 'archived';
    public_only?: boolean;
    my_campaigns?: boolean;
    max_players?: number;
    starting_level_min?: number;
    starting_level_max?: number;
    setting?: string;
    search_query?: string;
}

// Campaign statistics
export interface CampaignStats {
    total_sessions: number;
    total_playtime: number; // in minutes
    average_session_length: number;
    most_active_player: string;
    character_deaths: number;
    major_events: number;
    ai_responses_count: number;
}

export * from './character';
export * from './auth';
export * from './ui';

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