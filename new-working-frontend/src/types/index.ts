// User types
export interface User {
    id: string;
    username: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    created_at: string;
}

// ✅ ОБНОВЛЕННЫЙ Character types с поддержкой игр
export interface Character {
    id: string;
    name: string;
    race: string;
    character_class: string;
    level: number;
    owner_id: string;
    is_alive: boolean;
    created_at: string;
    background?: string;
    // Дополнительные поля для детального просмотра
    current_hit_points?: number;
    max_hit_points?: number;
    armor_class?: number;
    hit_points?: {
        current: number;
        max: number;
        temporary: number;
    };
    abilities?: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    skills?: Record<string, boolean | number>;
    equipment?: string[];
    spells?: string[];
    notes?: string;
    alignment?: string;
    experience_points?: number;
}

// ✅ НОВЫЙ АЛИАС для совместимости
export interface CharacterResponse extends Character {}

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

// ✅ ОБНОВЛЕННЫЕ Game types с поддержкой персонажей
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

export interface GameResponse extends Game {}

// ✅ НОВЫЙ РАСШИРЕННЫЙ Game интерфейс
export interface GameDetail extends Game {
    players: Record<string, PlayerInfo>; // ✅ ОБНОВЛЕНО: теперь объект с PlayerInfo
    characters: string[];
    player_characters: Record<string, string>; // ✅ НОВОЕ ПОЛЕ
    turn_info: {
        current_turn: number;
        current_player_index: number;
        current_player_id?: string;
    };
    settings: Record<string, any>;
    world_state: Record<string, any>;
    statistics: {
        session_duration: number;
        total_messages: number;
        total_dice_rolls: number;
    };
    updated_at: string;
}

// ✅ НОВЫЙ АЛИАС для совместимости
export interface GameDetailResponse extends GameDetail {}

// ✅ НОВЫЙ ИНТЕРФЕЙС для информации об игроках с персонажами
export interface PlayerInfo {
    user_id: string;
    username: string;
    character_id?: string;
    character_name?: string;
    character_class?: string;
    character_level?: number;
    character_race?: string;
    character_info?: {
        id: string;
        name: string;
        race: string;
        character_class: string;
        level: number;
        current_hit_points: number;
        max_hit_points: number;
        armor_class: number;
        abilities?: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        };
        skills?: Record<string, boolean>;
        background?: string;
    };
    is_online: boolean;
    is_current_user?: boolean;
}

// ✅ ОБНОВЛЕННЫЙ GamePlayer для совместимости (наследует от PlayerInfo)
export interface GamePlayer extends PlayerInfo {
    character_id: string;
    character_name: string;
    last_action?: string;
    initiative?: number;
    current_hp?: number;
    max_hp?: number;
    character?: Character;
    isCurrentTurn?: boolean;
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

// Initiative tracking
export interface InitiativeEntry {
    character_id: string;
    character_name: string;
    player_name?: string; // ✅ НОВОЕ: имя персонажа для отображения
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
    character_name?: string; // ✅ НОВОЕ: имя персонажа
    advantage?: boolean;
    disadvantage?: boolean;
}

// ✅ ОБНОВЛЕННЫЕ Chat and messages с поддержкой персонажей
export interface GameMessage {
    id: string;
    type: 'chat' | 'action' | 'dice_roll' | 'system' | 'ai_dm' | 'ooc' | 'player_action' | 'ai_response' | 'dice_check_result';
    content?: string;
    message?: string; // ✅ Альтернативное поле для content
    sender?: string; // ✅ Для обратной совместимости (author)
    author?: string; // ✅ Для обратной совместимости
    sender_name?: string; // ✅ НОВОЕ: имя персонажа
    sender_username?: string; // ✅ НОВОЕ: username для технических целей
    sender_id?: string;
    character_id?: string;
    timestamp: string;
    dice_roll?: DiceRollResult;
    is_whisper?: boolean;
    whisper_to?: string[];
    // ✅ Дополнительные поля для бросков
    game_id?: string;
    message_type?: string;
    total?: number;
    success?: boolean;
    base_roll?: number;
    modifier?: number;
    dc?: number;
}

// ✅ НОВЫЕ ИНТЕРФЕЙСЫ для WebSocket сообщений
export interface WebSocketGameState {
    game_id: string;
    game_name: string;
    status: string;
    current_scene?: string;
    players: Record<string, PlayerInfo>;
    your_character?: PlayerInfo['character_info'];
    turn_info?: {
        current_turn: number;
        current_player_index: number;
        current_player_id?: string;
    };
    world_state?: Record<string, any>;
    settings?: Record<string, any>;
}

export interface WebSocketMessage {
    type: 'chat_message' | 'player_action' | 'ai_response' | 'system' | 'dice_roll_request' | 'dice_check_result' | 'game_state' | 'error' | 'connected' | 'player_joined' | 'player_left' | 'dice_roll' | 'game_state_update' | 'initiative_update';
    data: any;
    timestamp?: string;
}

export interface ChatMessage {
    content: string;
    sender_id: string;
    sender_name: string; // ✅ Имя персонажа
    sender_username?: string; // ✅ Username для технических целей
    timestamp: string;
    message_type: 'chat';
}

export interface PlayerAction {
    action: string;
    player_id: string;
    player_name: string; // ✅ Имя персонажа
    character_info?: PlayerInfo['character_info'];
    timestamp: string;
}

export interface AiResponse {
    message: string;
    sender_name: 'ИИ Мастер';
    timestamp: string;
    in_response_to?: string;
    responding_to_player?: string; // ✅ Имя персонажа
}

export interface DiceRollRequest {
    message: string;
    player_name: string; // ✅ Имя персонажа
    roll_type: string;
    skill: string;
    dc: number;
    modifier: number;
    advantage: boolean;
    disadvantage: boolean;
    timestamp: string;
}

export interface DiceCheckResult {
    message: string;
    sender_name: 'ИИ Мастер';
    timestamp: string;
    base_roll: number;
    modifier: number;
    final_total: number;
    dc: number;
    success: boolean;
    original_action: string;
    player_name: string; // ✅ Имя персонажа
    skill_display: string;
    is_dice_check_result: true;
}

export interface SystemMessage {
    message: string;
    player_name?: string; // ✅ Имя персонажа (для присоединения/выхода)
    user_id?: string;
    character_info?: PlayerInfo['character_info'];
    timestamp: string;
}

// AI Dungeon Master
export interface AiDmResponse {
    message?: string;
    response?: string; // ✅ Альтернативное поле
    scene_description?: string;
    suggested_actions?: string[];
    context_used?: Record<string, any>;
    suggestions?: string[];
    responding_to_character?: string; // ✅ НОВОЕ: имя персонажа, на которого отвечает ИИ
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

// ✅ НОВЫЕ ИНТЕРФЕЙСЫ для создания и обновления игр
export interface CreateGameData {
    campaign_id: string;
    name: string;
    description?: string;
    max_players?: number;
}

export interface UpdateGameData {
    name?: string;
    description?: string;
    current_scene?: string;
    settings?: Record<string, any>;
}

export interface JoinGameData {
    character_id?: string; // ✅ ОБНОВЛЕНО: теперь обязательно для присоединения
}

export interface GetGamesParams {
    status_filter?: string;
    campaign_id?: string;
    limit?: number;
    offset?: number;
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
    session_id?: string;
    current_scene: string;
    active_players: GamePlayer[];
    current_turn?: string;
    turn_number: number;
    initiative_order: InitiativeEntry[];
    active_effects?: GameEffect[];
    current_location?: GameLocation;
    party_inventory?: GameItem[];
    ai_context: string[];
    recent_events: string[];
    players?: Record<string, PlayerInfo>; // ✅ НОВОЕ для совместимости
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
    CharacterResponse,
    Campaign,
    CampaignDetail,
    Game,
    GameDetail,
    GameResponse,
    GameDetailResponse,
    PlayerInfo,
    GamePlayer,
    GameMessage,
    DiceRollResult,
    InitiativeEntry,
    GameState,
    WebSocketMessage,
    WebSocketGameState,
};