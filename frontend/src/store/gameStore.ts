import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import { gameService } from '@/services/gameService';
import { websocketService, ConnectionState } from '@/services/websocketService';
import type {
    GameDetailResponse,
    GameMessage,
    GamePlayer,
    InitiativeEntry,
    DiceRollResult,
    AiDmResponse,
    GameSessionState
} from '@/services/gameService';

interface GameState {
    // Основное состояние игры
    currentGame: GameDetailResponse | null;
    gameState: GameSessionState | null;
    isLoading: boolean;
    error: string | null;

    // WebSocket состояние
    connectionState: ConnectionState;
    isConnected: boolean;

    // Чат и сообщения
    messages: GameMessage[];
    isLoadingMessages: boolean;

    // Игроки
    players: GamePlayer[];
    activePlayers: GamePlayer[];

    // Инициатива и ходы
    initiativeOrder: InitiativeEntry[];
    currentTurn: string | null;
    turnNumber: number;

    // Сцена и окружение
    currentScene: string;
    sceneDescription: string;

    // Последние события
    lastDiceRoll: DiceRollResult | null;
    lastAiResponse: AiDmResponse | null;

    // Действия
    joinGame: (gameId: string, characterId?: string) => Promise<void>;
    leaveGame: () => Promise<void>;
    loadGame: (gameId: string) => Promise<void>;

    // WebSocket действия
    connectWebSocket: (gameId: string) => Promise<void>;
    disconnectWebSocket: () => Promise<void>;

    // Чат действия
    sendMessage: (content: string, type?: string) => Promise<void>;
    loadMessages: (limit?: number) => Promise<void>;

    // Игровые действия
    rollDice: (notation: string, purpose?: string) => Promise<void>;
    rollInitiative: (characterId: string) => Promise<void>;
    nextTurn: () => Promise<void>;

    // Обновления состояния
    updatePlayerStatus: (playerId: string, updates: Partial<GamePlayer>) => void;
    updateGameState: (updates: Partial<GameSessionState>) => void;
    clearGame: () => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>()(
    subscribeWithSelector((set, get) => ({
        // Начальное состояние
        currentGame: null,
        gameState: null,
        isLoading: false,
        error: null,

        connectionState: ConnectionState.DISCONNECTED,
        isConnected: false,

        messages: [],
        isLoadingMessages: false,

        players: [],
        activePlayers: [],

        initiativeOrder: [],
        currentTurn: null,
        turnNumber: 0,

        currentScene: '',
        sceneDescription: '',

        lastDiceRoll: null,
        lastAiResponse: null,

        // Присоединение к игре
        joinGame: async (gameId: string, characterId?: string) => {
            set({ isLoading: true, error: null });

            try {
                // Присоединяемся к игре через API
                await gameService.joinGame(gameId, { character_id: characterId });

                // Загружаем данные игры
                await get().loadGame(gameId);

                // Подключаемся через WebSocket
                await get().connectWebSocket(gameId);

                toast.success('Присоединились к игре!');
            } catch (error: any) {
                const errorMessage = error.response?.data?.detail || 'Ошибка при присоединении к игре';
                set({ error: errorMessage, isLoading: false });
                toast.error(errorMessage);
                throw error;
            }
        },

        // Покинуть игру
        leaveGame: async () => {
            const currentGame = get().currentGame;
            if (!currentGame) return;

            try {
                await gameService.leaveGame(currentGame.id);
                await get().disconnectWebSocket();
                get().clearGame();
                toast.success('Покинули игру');
            } catch (error: any) {
                const errorMessage = error.response?.data?.detail || 'Ошибка при выходе из игры';
                toast.error(errorMessage);
            }
        },

        // Загрузка игры
        loadGame: async (gameId: string) => {
            set({ isLoading: true, error: null });

            try {
                // Загружаем основные данные игры
                const game = await gameService.getGame(gameId);
                const gameState = await gameService.getGameState(gameId);
                const players = await gameService.getActivePlayers(gameId);
                const initiativeOrder = await gameService.getInitiativeOrder(gameId);

                set({
                    currentGame: game,
                    gameState,
                    players,
                    activePlayers: players.filter(p => p.is_online),
                    initiativeOrder,
                    currentTurn: gameState.current_turn || null,
                    turnNumber: gameState.time.turn_number || 0,
                    currentScene: game.current_scene || '',
                    sceneDescription: gameState.current_scene || '',
                    isLoading: false,
                });

                // Загружаем историю сообщений
                await get().loadMessages();

            } catch (error: any) {
                const errorMessage = error.response?.data?.detail || 'Ошибка при загрузке игры';
                set({ error: errorMessage, isLoading: false });
                toast.error(errorMessage);
            }
        },

        // Подключение WebSocket
        connectWebSocket: async (gameId: string) => {
            try {
                // Подписываемся на события WebSocket
                websocketService.on('connected', () => {
                    set({ connectionState: ConnectionState.CONNECTED, isConnected: true });
                    console.log('WebSocket connected to game:', gameId);
                });

                websocketService.on('disconnected', () => {
                    set({ connectionState: ConnectionState.DISCONNECTED, isConnected: false });
                });

                websocketService.on('message', (message: any) => {
                    const currentMessages = get().messages;
                    set({ messages: [message, ...currentMessages].slice(0, 100) }); // Ограничиваем до 100 сообщений
                });

                websocketService.on('player_joined', (data: any) => {
                    const currentPlayers = get().players;
                    const existingPlayer = currentPlayers.find(p => p.user_id === data.user_id);

                    if (!existingPlayer) {
                        set({
                            players: [...currentPlayers, data],
                            activePlayers: [...get().activePlayers, data]
                        });
                    } else {
                        // Обновляем статус существующего игрока
                        get().updatePlayerStatus(data.user_id, { is_online: true });
                    }

                    toast.success(`${data.username} присоединился к игре`);
                });

                websocketService.on('player_left', (data: any) => {
                    get().updatePlayerStatus(data.user_id, { is_online: false });
                    toast.info(`${data.username} покинул игру`);
                });

                websocketService.on('dice_rolled', (rollResult: DiceRollResult) => {
                    set({ lastDiceRoll: rollResult });

                    // Добавляем сообщение о броске в чат
                    const rollMessage: GameMessage = {
                        id: `roll_${Date.now()}`,
                        game_id: gameId,
                        sender_id: rollResult.character_id || '',
                        sender_name: 'Система',
                        message_type: 'roll',
                        content: `Бросок ${rollResult.notation}: ${rollResult.total}${rollResult.is_critical ? ' (Критический успех!)' : ''}${rollResult.is_fumble ? ' (Критическая неудача!)' : ''}`,
                        timestamp: new Date().toISOString(),
                        dice_roll: rollResult,
                    };

                    const currentMessages = get().messages;
                    set({ messages: [rollMessage, ...currentMessages] });
                });

                websocketService.on('initiative_rolled', (data: any) => {
                    const currentOrder = get().initiativeOrder;
                    const updatedOrder = [...currentOrder];

                    const existingIndex = updatedOrder.findIndex(entry => entry.character_id === data.character_id);
                    if (existingIndex >= 0) {
                        updatedOrder[existingIndex] = { ...updatedOrder[existingIndex], initiative: data.initiative };
                    } else {
                        updatedOrder.push(data);
                    }

                    // Сортируем по инициативе (по убыванию)
                    updatedOrder.sort((a, b) => b.initiative - a.initiative);

                    set({ initiativeOrder: updatedOrder });
                });

                websocketService.on('turn_changed', (data: any) => {
                    set({
                        currentTurn: data.current_turn,
                        turnNumber: data.turn_number || get().turnNumber + 1
                    });

                    // Обновляем активного игрока в порядке инициативы
                    const currentOrder = get().initiativeOrder;
                    const updatedOrder = currentOrder.map(entry => ({
                        ...entry,
                        is_active: entry.character_id === data.current_turn
                    }));

                    set({ initiativeOrder: updatedOrder });
                });

                websocketService.on('scene_updated', (data: any) => {
                    set({
                        currentScene: data.scene_name || get().currentScene,
                        sceneDescription: data.scene_description || get().sceneDescription
                    });
                });

                websocketService.on('ai_response', (response: AiDmResponse) => {
                    set({ lastAiResponse: response });

                    // Добавляем ответ ИИ в чат
                    const aiMessage: GameMessage = {
                        id: `ai_${Date.now()}`,
                        game_id: gameId,
                        sender_id: 'ai_dm',
                        sender_name: 'ИИ-Мастер',
                        message_type: 'ai_dm',
                        content: response.message,
                        timestamp: new Date().toISOString(),
                    };

                    const currentMessages = get().messages;
                    set({ messages: [aiMessage, ...currentMessages] });

                    // Обновляем состояние игры если есть обновления
                    if (response.scene_description) {
                        set({ sceneDescription: response.scene_description });
                    }

                    if (response.combat_update) {
                        const combat = response.combat_update;
                        if (combat.current_turn) {
                            set({ currentTurn: combat.current_turn });
                        }
                        if (combat.round_number) {
                            set({ turnNumber: combat.round_number });
                        }
                    }
                });

                websocketService.on('error', (error: any) => {
                    console.error('WebSocket error:', error);
                    toast.error('Ошибка соединения с игрой');
                    set({ connectionState: ConnectionState.ERROR });
                });

                // Подключаемся
                await websocketService.connect(gameId);

            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                set({ connectionState: ConnectionState.ERROR });
                toast.error('Не удалось подключиться к игре');
            }
        },

        // Отключение WebSocket
        disconnectWebSocket: async () => {
            await websocketService.disconnect();
            set({
                connectionState: ConnectionState.DISCONNECTED,
                isConnected: false
            });
        },

        // Отправка сообщения
        sendMessage: async (content: string, type: string = 'chat') => {
            const currentGame = get().currentGame;
            if (!currentGame || !get().isConnected) {
                toast.error('Не подключены к игре');
                return;
            }

            try {
                if (type === 'chat') {
                    websocketService.sendChatMessage(content);
                } else {
                    websocketService.send(type, { content });
                }
            } catch (error) {
                console.error('Failed to send message:', error);
                toast.error('Не удалось отправить сообщение');
            }
        },

        // Загрузка сообщений
        loadMessages: async (limit: number = 50) => {
            const currentGame = get().currentGame;
            if (!currentGame) return;

            set({ isLoadingMessages: true });

            try {
                const messages = await gameService.getGameMessages(currentGame.id, limit);
                set({ messages: messages.reverse(), isLoadingMessages: false }); // Reverse для хронологического порядка
            } catch (error) {
                console.error('Failed to load messages:', error);
                set({ isLoadingMessages: false });
            }
        },

        // Бросок костей
        rollDice: async (notation: string, purpose?: string) => {
            const currentGame = get().currentGame;
            if (!currentGame) {
                toast.error('Не подключены к игре');
                return;
            }

            try {
                if (get().isConnected) {
                    websocketService.sendDiceRoll(notation, purpose);
                } else {
                    // Fallback через API
                    const result = await gameService.rollDice(currentGame.id, notation, purpose);
                    set({ lastDiceRoll: result });
                }
            } catch (error) {
                console.error('Failed to roll dice:', error);
                toast.error('Не удалось выполнить бросок');
            }
        },

        // Инициатива
        rollInitiative: async (characterId: string) => {
            const currentGame = get().currentGame;
            if (!currentGame) {
                toast.error('Не подключены к игре');
                return;
            }

            try {
                if (get().isConnected) {
                    websocketService.sendInitiativeRoll(characterId);
                } else {
                    // Fallback через API
                    const result = await gameService.rollInitiative(currentGame.id, characterId);
                    toast.success(`Инициатива: ${result.initiative}`);
                }
            } catch (error) {
                console.error('Failed to roll initiative:', error);
                toast.error('Не удалось выполнить бросок инициативы');
            }
        },

        // Следующий ход
        nextTurn: async () => {
            const currentGame = get().currentGame;
            if (!currentGame) return;

            try {
                const result = await gameService.nextTurn(currentGame.id);
                set({
                    currentTurn: result.current_turn,
                    turnNumber: result.turn_number
                });
            } catch (error) {
                console.error('Failed to advance turn:', error);
                toast.error('Не удалось передать ход');
            }
        },

        // Обновление статуса игрока
        updatePlayerStatus: (playerId: string, updates: Partial<GamePlayer>) => {
            const currentPlayers = get().players;
            const updatedPlayers = currentPlayers.map(player =>
                player.user_id === playerId ? { ...player, ...updates } : player
            );

            const activePlayers = updatedPlayers.filter(p => p.is_online);

            set({
                players: updatedPlayers,
                activePlayers
            });
        },

        // Обновление состояния игры
        updateGameState: (updates: Partial<GameSessionState>) => {
            const currentState = get().gameState;
            if (currentState) {
                set({ gameState: { ...currentState, ...updates } });
            }
        },

        // Очистка состояния
        clearGame: () => {
            set({
                currentGame: null,
                gameState: null,
                messages: [],
                players: [],
                activePlayers: [],
                initiativeOrder: [],
                currentTurn: null,
                turnNumber: 0,
                currentScene: '',
                sceneDescription: '',
                lastDiceRoll: null,
                lastAiResponse: null,
                error: null,
                connectionState: ConnectionState.DISCONNECTED,
                isConnected: false,
            });
        },

        // Установка ошибки
        setError: (error: string | null) => {
            set({ error });
        },
    }))
);

// Хуки для удобного использования
export const useGameActions = () => {
    const {
        joinGame,
        leaveGame,
        loadGame,
        connectWebSocket,
        disconnectWebSocket,
        sendMessage,
        loadMessages,
        rollDice,
        rollInitiative,
        nextTurn,
        updatePlayerStatus,
        updateGameState,
        clearGame,
        setError,
    } = useGameStore();

    return {
        joinGame,
        leaveGame,
        loadGame,
        connectWebSocket,
        disconnectWebSocket,
        sendMessage,
        loadMessages,
        rollDice,
        rollInitiative,
        nextTurn,
        updatePlayerStatus,
        updateGameState,
        clearGame,
        setError,
    };
};

export const useGameData = () => {
    const {
        currentGame,
        gameState,
        isLoading,
        error,
        connectionState,
        isConnected,
        messages,
        isLoadingMessages,
        players,
        activePlayers,
        initiativeOrder,
        currentTurn,
        turnNumber,
        currentScene,
        sceneDescription,
        lastDiceRoll,
        lastAiResponse,
    } = useGameStore();

    return {
        currentGame,
        gameState,
        isLoading,
        error,
        connectionState,
        isConnected,
        messages,
        isLoadingMessages,
        players,
        activePlayers,
        initiativeOrder,
        currentTurn,
        turnNumber,
        currentScene,
        sceneDescription,
        lastDiceRoll,
        lastAiResponse,
    };
};

export default useGameStore;