import { apiService } from './api';

// Типы для создания игры
export interface CreateGameData {
    campaign_id: string;
    name: string;
    description?: string;
    max_players: number;
}

// Типы для обновления игры
export interface UpdateGameData {
    name?: string;
    description?: string;
    current_scene?: string;
    settings?: Record<string, any>;
}

// Ответ сервера при получении игры
export interface GameResponse {
    id: string;
    name: string;
    description?: string;
    status: 'waiting' | 'active' | 'paused' | 'completed';
    current_players: number;
    max_players: number;
    current_scene?: string;
    created_at: string;
}

// Подробная информация об игре
export interface GameDetailResponse extends GameResponse {
    campaign_id: string;
    players: string[]; // user IDs
    settings?: Record<string, any>;
    current_turn?: string;
    turn_number?: number;
    session_start?: string;
}

// Параметры для получения списка игр
export interface GetGamesParams {
    status_filter?: 'waiting' | 'active' | 'paused' | 'completed';
    campaign_id?: string;
    limit?: number;
    offset?: number;
}

// Присоединение к игре
export interface JoinGameData {
    character_id?: string;
}

// Игровое сообщение чата
export interface GameMessage {
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

// Результат броска костей
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

// ИИ ответ мастера
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

// Состояние игровой сессии
export interface GameSessionState {
    players: GamePlayer[];
    current_scene: string;
    current_turn?: string;
    initiative_order: InitiativeEntry[];
    environment: {
        lighting: 'bright' | 'dim' | 'dark';
        weather?: string;
        terrain?: string;
    };
    time: {
        in_game_date: string;
        session_duration: number;
        turn_number: number;
    };
}

export interface GamePlayer {
    user_id: string;
    character_id: string;
    username: string;
    character_name: string;
    is_online: boolean;
    initiative?: number;
    current_hp?: number;
    max_hp?: number;
}

export interface InitiativeEntry {
    character_id: string;
    character_name: string;
    initiative: number;
    is_player: boolean;
    is_active: boolean;
}

class GameService {
    // Создание новой игры
    async createGame(data: CreateGameData): Promise<GameResponse> {
        return apiService.post('/games', data);
    }

    // Получить список игр
    async getGames(params: GetGamesParams = {}): Promise<GameResponse[]> {
        const queryParams = {
            status_filter: params.status_filter,
            campaign_id: params.campaign_id,
            limit: params.limit || 20,
            offset: params.offset || 0,
        };

        return apiService.get('/games', queryParams);
    }

    // Получить игры по кампании
    async getGamesByCampaign(campaignId: string): Promise<GameResponse[]> {
        return this.getGames({ campaign_id: campaignId });
    }

    // Получить активные игры
    async getActiveGames(): Promise<GameResponse[]> {
        return this.getGames({ status_filter: 'active' });
    }

    // Получить игру по ID
    async getGame(gameId: string): Promise<GameDetailResponse> {
        return apiService.get(`/games/${gameId}`);
    }

    // Обновить игру
    async updateGame(gameId: string, data: UpdateGameData): Promise<GameDetailResponse> {
        return apiService.put(`/games/${gameId}`, data);
    }

    // Присоединиться к игре
    async joinGame(gameId: string, data: JoinGameData = {}): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/join`, data);
    }

    // Покинуть игру
    async leaveGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/leave`);
    }

    // Начать игровую сессию
    async startGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/start`);
    }

    // Поставить игру на паузу
    async pauseGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/pause`);
    }

    // Завершить игру
    async endGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/end`);
    }

    // Получить историю сообщений
    async getGameMessages(gameId: string, limit: number = 50, offset: number = 0): Promise<GameMessage[]> {
        return apiService.get(`/games/${gameId}/messages`, { limit, offset });
    }

    // Отправить сообщение в чат
    async sendMessage(gameId: string, content: string, messageType: string = 'chat'): Promise<GameMessage> {
        return apiService.post(`/games/${gameId}/messages`, {
            content,
            message_type: messageType,
        });
    }

    // Бросить кости
    async rollDice(gameId: string, notation: string, purpose?: string, characterId?: string): Promise<DiceRollResult> {
        return apiService.post(`/games/${gameId}/roll`, {
            notation,
            purpose,
            character_id: characterId,
        });
    }

    // Получить ответ от ИИ-мастера
    async getAiResponse(gameId: string, playerMessage: string, context?: any): Promise<AiDmResponse> {
        return apiService.post(`/games/${gameId}/ai-response`, {
            message: playerMessage,
            context,
        });
    }

    // Инициатива
    async rollInitiative(gameId: string, characterId: string): Promise<{ initiative: number }> {
        return apiService.post(`/games/${gameId}/initiative`, {
            character_id: characterId,
        });
    }

    // Получить порядок инициативы
    async getInitiativeOrder(gameId: string): Promise<InitiativeEntry[]> {
        return apiService.get(`/games/${gameId}/initiative`);
    }

    // Следующий ход
    async nextTurn(gameId: string): Promise<{ current_turn: string; turn_number: number }> {
        return apiService.post(`/games/${gameId}/next-turn`);
    }

    // Получить состояние игровой сессии
    async getGameState(gameId: string): Promise<GameSessionState> {
        return apiService.get(`/games/${gameId}/state`);
    }

    // Сохранить состояние игры
    async saveGameState(gameId: string, state: Partial<GameSessionState>): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/save`, state);
    }

    // Загрузить сохранённое состояние
    async loadGameState(gameId: string, saveId: string): Promise<GameSessionState> {
        return apiService.post(`/games/${gameId}/load`, { save_id: saveId });
    }

    // Получить список активных игроков в игре
    async getActivePlayers(gameId: string): Promise<GamePlayer[]> {
        return apiService.get(`/games/${gameId}/players`);
    }

    // Обновить HP персонажа в игре
    async updateCharacterHP(gameId: string, characterId: string, hp: number): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/characters/${characterId}/hp`, {
            current_hp: hp,
        });
    }

    // Применить эффект к персонажу
    async applyEffect(gameId: string, characterId: string, effect: any): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/characters/${characterId}/effects`, effect);
    }

    // Получить статистику игры
    async getGameStats(gameId: string): Promise<{
        session_duration: number;
        messages_count: number;
        rolls_count: number;
        turns_count: number;
    }> {
        return apiService.get(`/games/${gameId}/stats`);
    }
}

// Экспорт синглтона
export const gameService = new GameService();
export default gameService;