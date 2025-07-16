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

export interface StartGameData {
    campaign_id: string;
    character_id: string;
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
    players: Record<string, any>;
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
    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Начать игру с правильной логикой
    async startGame(data: StartGameData): Promise<{ id: string; isNew: boolean }> {
        try {
            console.log('🎮 Starting game with data:', data);

            // Сначала пробуем получить существующие игры для кампании
            let existingGames: GameResponse[] = [];
            try {
                existingGames = await this.getGames({
                    campaign_id: data.campaign_id,
                    status_filter: 'active'
                });
            } catch (error) {
                console.log('📝 No existing games found, will create new one');
                existingGames = [];
            }

            // Если есть активная игра, присоединяемся к ней
            if (existingGames && existingGames.length > 0) {
                const activeGame = existingGames[0];
                console.log('🔄 Joining existing game:', activeGame.id);

                try {
                    await this.joinGame(activeGame.id, { character_id: data.character_id });
                    return { id: activeGame.id, isNew: false };
                } catch (joinError) {
                    console.log('❌ Failed to join existing game, creating new one');
                }
            }

            // Создаем новую игру
            console.log('🆕 Creating new game for campaign:', data.campaign_id);
            const newGame = await this.createGame({
                campaign_id: data.campaign_id,
                name: `Игра`,
                description: `Автоматически созданная игра`,
                max_players: 6,
            });

            console.log('✅ New game created:', newGame.id);

            // Присоединяемся к новой игре с персонажем
            await this.joinGame(newGame.id, { character_id: data.character_id });

            return { id: newGame.id, isNew: true };

        } catch (error) {
            console.error('❌ Error in startGame:', error);
            throw error;
        }
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Создать игру (убираем /api префикс)
    async createGame(data: CreateGameData): Promise<GameResponse> {
        return apiService.post('/games', data);
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Получить список игр (убираем /api префикс)
    async getGames(params: GetGamesParams = {}): Promise<GameResponse[]> {
        const queryParams = new URLSearchParams();

        if (params.status_filter) {
            queryParams.append('status_filter', params.status_filter);
        }
        if (params.campaign_id) {
            queryParams.append('campaign_id', params.campaign_id);
        }
        if (params.limit) {
            queryParams.append('limit', params.limit.toString());
        }
        if (params.offset) {
            queryParams.append('offset', params.offset.toString());
        }

        const queryString = queryParams.toString();
        const url = queryString ? `/games?${queryString}` : '/games';

        return apiService.get(url);
    }

    // Получить игры по кампании
    async getGamesByCampaign(campaignId: string): Promise<GameResponse[]> {
        return this.getGames({ campaign_id: campaignId });
    }

    // Получить активные игры
    async getActiveGames(): Promise<GameResponse[]> {
        return this.getGames({ status_filter: 'active' });
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Получить игру по ID (убираем /api префикс)
    async getGame(gameId: string): Promise<GameDetailResponse> {
        return apiService.get(`/games/${gameId}`);
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Обновить игру (убираем /api префикс)
    async updateGame(gameId: string, data: UpdateGameData): Promise<GameDetailResponse> {
        return apiService.put(`/games/${gameId}`, data);
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Присоединиться к игре (убираем /api префикс)
    async joinGame(gameId: string, data: JoinGameData = {}): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/join`, data);
    }

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Покинуть игру (убираем /api префикс)
    async leaveGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/leave`);
    }

    // Начать игровую сессию
    async startSession(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/start`);
    }

    // Завершить игровую сессию
    async endSession(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/end`);
    }

    // Приостановить игру
    async pauseGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/pause`);
    }

    // Возобновить игру
    async resumeGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/resume`);
    }

    // Получить игроков игры
    async getGamePlayers(gameId: string): Promise<GamePlayer[]> {
        return apiService.get(`/games/${gameId}/players`);
    }

    // Отправить сообщение в игровой чат
    async sendMessage(gameId: string, message: string, messageType: string = 'chat'): Promise<void> {
        return apiService.post(`/games/${gameId}/messages`, {
            message,
            type: messageType,
        });
    }

    // Бросить кости
    async rollDice(gameId: string, diceData: DiceRollData): Promise<DiceRollResult> {
        return apiService.post(`/games/${gameId}/roll`, diceData);
    }

    // Получить ответ от AI DM
    async getAiResponse(gameId: string, message: string, context?: any): Promise<AiDmResponse> {
        return apiService.post(`/games/${gameId}/ai-response`, {
            message,
            context,
        });
    }

    // Обновить состояние игровой сессии
    async updateSessionState(gameId: string, state: Partial<GameSessionState>): Promise<GameSessionState> {
        return apiService.put(`/games/${gameId}/session-state`, state);
    }

    // Получить состояние игровой сессии
    async getSessionState(gameId: string): Promise<GameSessionState> {
        return apiService.get(`/games/${gameId}/session-state`);
    }

    // Обновить инициативу
    async updateInitiative(gameId: string, initiative: InitiativeEntry[]): Promise<{ message: string }> {
        return apiService.put(`/games/${gameId}/initiative`, { initiative });
    }

    // Следующий ход
    async nextTurn(gameId: string): Promise<{ current_turn: InitiativeEntry }> {
        return apiService.post(`/games/${gameId}/next-turn`);
    }

    // Обновить HP персонажа
    async updateCharacterHp(gameId: string, characterId: string, hp: number): Promise<{ message: string }> {
        return apiService.put(`/games/${gameId}/characters/${characterId}/hp`, { hp });
    }

    // Добавить эффект к персонажу
    async addCharacterEffect(gameId: string, characterId: string, effect: any): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/characters/${characterId}/effects`, effect);
    }

    // Удалить эффект с персонажа
    async removeCharacterEffect(gameId: string, characterId: string, effectId: string): Promise<{ message: string }> {
        return apiService.delete(`/games/${gameId}/characters/${characterId}/effects/${effectId}`);
    }

    // Получить историю сообщений игры
    async getGameHistory(gameId: string, limit: number = 50, offset: number = 0): Promise<GameMessage[]> {
        return apiService.get(`/games/${gameId}/history?limit=${limit}&offset=${offset}`);
    }

    // Сохранить игру
    async saveGame(gameId: string): Promise<{ message: string, save_id: string }> {
        return apiService.post(`/games/${gameId}/save`);
    }

    // Загрузить игру
    async loadGame(gameId: string, saveId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/load`, { save_id: saveId });
    }

    // Получить статистику игры
    async getGameStats(gameId: string): Promise<any> {
        return apiService.get(`/games/${gameId}/stats`);
    }

    // Удалить игру
    async deleteGame(gameId: string): Promise<{ message: string }> {
        return apiService.delete(`/games/${gameId}`);
    }

    // Архивировать игру
    async archiveGame(gameId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/archive`);
    }

    // Пригласить игрока в игру
    async invitePlayer(gameId: string, userId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/invite`, { user_id: userId });
    }

    // Исключить игрока из игры
    async kickPlayer(gameId: string, userId: string): Promise<{ message: string }> {
        return apiService.post(`/games/${gameId}/kick`, { user_id: userId });
    }

    // Обновить настройки игры
    async updateGameSettings(gameId: string, settings: any): Promise<{ message: string }> {
        return apiService.put(`/games/${gameId}/settings`, settings);
    }

    // Получить настройки игры
    async getGameSettings(gameId: string): Promise<any> {
        return apiService.get(`/games/${gameId}/settings`);
    }
}

// Экспортируем экземпляр сервиса
export const gameService = new GameService();
export default gameService;