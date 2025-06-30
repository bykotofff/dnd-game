import apiService from '@/services/api';
import type { Game, GameMessage, Character, DiceRollData } from '@/types';

// Типы для GameService
export interface CreateGameData {
    name: string;
    description?: string;
    campaign_id: string;
    max_players?: number;
    game_system?: string;
    settings?: any;
}

export interface UpdateGameData {
    name?: string;
    description?: string;
    max_players?: number;
    settings?: any;
}

export interface JoinGameData {
    character_id?: string;
}

export interface GetGamesParams {
    status_filter?: 'waiting' | 'active' | 'paused' | 'ended';
    campaign_id?: string;
    limit?: number;
    offset?: number;
}

export interface GameResponse {
    id: string;
    name: string;
    description: string;
    status: string;
    current_players: number;
    max_players: number;
    current_scene?: string;
    created_at: string;
}

export interface GameDetailResponse extends GameResponse {
    campaign_id: string;
    game_system: string;
    settings: any;
    players: string[];
    characters: string[];
    updated_at: string;
}

export interface DiceRollResult {
    notation: string;
    result: number;
    rolls: number[];
    total: number;
    modifier: number;
    purpose?: string;
    character_name?: string;
}

export interface AiDmResponse {
    response: string;
    context_used: any;
    suggestions?: string[];
}

export interface GameSessionState {
    current_scene: string;
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
    // ✅ УЛУЧШЕННОЕ СОЗДАНИЕ ИГРЫ
    async createGame(data: CreateGameData): Promise<GameResponse> {
        return apiService.retryRequest(() =>
                apiService.post('/games', data),
            2 // Retry только 2 раза для создания
        );
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

    // ✅ КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД: Получить игру по ID с retry
    async getGame(gameId: string): Promise<GameDetailResponse> {
        return apiService.retryRequest(
            () => apiService.getWithExtendedTimeout(`/games/${gameId}`, undefined, 45000),
            3, // 3 попытки
            2000 // 2 секунды между попытками
        );
    }

    // Обновить игру
    async updateGame(gameId: string, data: UpdateGameData): Promise<GameDetailResponse> {
        return apiService.retryRequest(() =>
                apiService.put(`/games/${gameId}`, data),
            2
        );
    }

    // ✅ ПРИСОЕДИНЕНИЕ К ИГРЕ с retry
    async joinGame(gameId: string, data: JoinGameData = {}): Promise<{ message: string }> {
        return apiService.retryRequest(() =>
                apiService.post(`/games/${gameId}/join`, data),
            3
        );
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

    // ✅ ПОЛУЧЕНИЕ СООБЩЕНИЙ с retry
    async getGameMessages(gameId: string, limit: number = 50, offset: number = 0): Promise<GameMessage[]> {
        return apiService.retryRequest(() =>
                apiService.get(`/games/${gameId}/messages`, { limit, offset }),
            2
        );
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
        return apiService.postWithExtendedTimeout(`/games/${gameId}/ai-response`, {
            message: playerMessage,
            context,
        }, 90000); // 90 секунд для ИИ ответов
    }

    // ✅ ИНИЦИАТИВА с retry
    async rollInitiative(gameId: string, characterId: string): Promise<{ initiative: number }> {
        return apiService.retryRequest(() =>
                apiService.post(`/games/${gameId}/initiative`, {
                    character_id: characterId,
                }),
            2
        );
    }

    // Получить порядок инициативы
    async getInitiativeOrder(gameId: string): Promise<InitiativeEntry[]> {
        return apiService.get(`/games/${gameId}/initiative`);
    }

    // Следующий ход
    async nextTurn(gameId: string): Promise<{ current_turn: string; turn_number: number }> {
        return apiService.post(`/games/${gameId}/next-turn`);
    }

    // ✅ ПОЛУЧЕНИЕ СОСТОЯНИЯ ИГРЫ с retry
    async getGameState(gameId: string): Promise<GameSessionState> {
        return apiService.retryRequest(() =>
                apiService.get(`/games/${gameId}/state`),
            2
        );
    }

    // Сохранить состояние игры
    async saveGameState(gameId: string, state: Partial<GameSessionState>): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/save`, state);
    }

    // Загрузить сохранённое состояние
    async loadGameState(gameId: string, saveId: string): Promise<GameSessionState> {
        return apiService.post(`/games/${gameId}/load`, { save_id: saveId });
    }

    // ✅ ПОЛУЧЕНИЕ АКТИВНЫХ ИГРОКОВ с retry
    async getActivePlayers(gameId: string): Promise<GamePlayer[]> {
        return apiService.retryRequest(() =>
                apiService.get(`/games/${gameId}/players`),
            2
        );
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

    // ✅ НОВЫЙ МЕТОД: Проверка доступности игры
    async checkGameAvailability(gameId: string): Promise<boolean> {
        try {
            await this.getGame(gameId);
            return true;
        } catch (error: any) {
            console.error('Game availability check failed:', error);
            return false;
        }
    }

    // ✅ НОВЫЙ МЕТОД: Получение краткой информации об игре (без retry для быстрой проверки)
    async getGameQuick(gameId: string): Promise<GameDetailResponse | null> {
        try {
            return await apiService.get(`/games/${gameId}`);
        } catch (error: any) {
            console.error('Quick game fetch failed:', error);
            return null;
        }
    }

    // ✅ НОВЫЙ МЕТОД: Проверка подключения к игре
    async pingGame(gameId: string): Promise<{ status: string; players_online: number }> {
        return apiService.get(`/games/${gameId}/ping`);
    }
}

// Экспорт синглтона
export const gameService = new GameService();
export default gameService;