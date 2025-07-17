// new-working-frontend/src/store/gameStore.ts - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { websocketService } from '@/services/websocketService';
import { gameService } from '@/services/gameService';
import type { Game, GameMessage, Character, DiceRollData } from '@/types';
import type { GamePlayer, InitiativeEntry } from '@/services/gameService';

interface GameState {
    // Current game state
    currentGame: Game | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;

    // Game data
    messages: GameMessage[];
    chatMessages: GameMessage[];
    playersOnline: GamePlayer[];
    activeCharacters: Character[];
    currentScene: string | null;

    // ✅ НОВЫЕ ПОЛЯ для совместимости с GamePage
    players: GamePlayer[];
    activePlayers: GamePlayer[];
    currentTurn: string | null;
    turnNumber: number;
    initiativeOrder: InitiativeEntry[];
    lastDiceRoll: any;

    // UI state
    chatInput: string;
    isTyping: boolean;
    showCharacterSheets: boolean;
    showDiceRoller: boolean;
    selectedCharacterId: string | null;

    // Actions
    connectToGame: (gameId: string) => Promise<void>;
    disconnectFromGame: () => Promise<void>;
    joinGame: (gameId: string) => Promise<void>;
    leaveGame: () => Promise<void>;
    // ✅ ОБНОВЛЕННАЯ СИГНАТУРА: поддержка строки или объекта
    loadGame: (gameId: string | Game) => Promise<Game>;
    clearGame: () => void;
    sendMessage: (content: string, isOOC?: boolean) => void;
    sendAction: (action: string) => void;
    rollDice: (notation: string, purpose?: string, advantage?: boolean, disadvantage?: boolean) => Promise<void>;

    // ✅ НОВЫЙ МЕТОД: Добавление сообщения
    addMessage: (message: GameMessage) => void;
    addChatMessage: (message: GameMessage) => void;

    // ✅ НОВЫЕ МЕТОДЫ для инициативы и управления игрой
    rollInitiative: (characterId: string) => Promise<void>;
    nextTurn: () => Promise<void>;
    setChatInput: (input: string) => void;
    setTyping: (typing: boolean) => void;
    toggleCharacterSheets: () => void;
    toggleDiceRoller: () => void;
    selectCharacter: (characterId: string | null) => void;
    updateCharacter: (characterId: string, updates: Partial<Character>) => void;
    clearGameState: () => void;
}

export const useGameStore = create<GameState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        currentGame: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        messages: [],
        chatMessages: [],
        playersOnline: [],
        activeCharacters: [],
        currentScene: null,
        players: [],
        activePlayers: [],
        currentTurn: null,
        turnNumber: 1,
        initiativeOrder: [],
        lastDiceRoll: null,
        chatInput: '',
        isTyping: false,
        showCharacterSheets: false,
        showDiceRoller: false,
        selectedCharacterId: null,

        // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Загрузка игры
        loadGame: async (gameId: string | Game) => {
            try {
                // ✅ ИСПРАВЛЕНИЕ: Обработка и строки и объекта
                let actualGameId: string;
                let gameData: Game;

                if (typeof gameId === 'string') {
                    // Если передана строка - загружаем игру по ID
                    console.log('Loading game by ID:', gameId);
                    actualGameId = gameId;
                    gameData = await gameService.getGame(gameId);
                } else if (typeof gameId === 'object' && gameId !== null && 'id' in gameId) {
                    // Если передан объект игры - используем его
                    console.log('Using game object:', gameId);
                    actualGameId = gameId.id;
                    gameData = gameId;
                } else {
                    // Неправильный тип
                    console.error('❌ Invalid gameId provided to loadGame:', gameId, typeof gameId);
                    throw new Error('Некорректный ID игры');
                }

                console.log('✅ Game loaded successfully:', gameData);

                set({
                    currentGame: gameData,
                    connectionError: null,
                });

                return gameData;

            } catch (error: any) {
                console.error('Failed to load game:', error);
                set({
                    connectionError: error.message || 'Не удалось загрузить игру',
                    isConnecting: false,
                    currentGame: null,
                });
                throw error;
            }
        },

        // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Присоединение к игре
        joinGame: async (gameId: string) => {
            // ✅ ИСПРАВЛЕНИЕ: Проверяем тип gameId
            if (!gameId || typeof gameId !== 'string') {
                console.error('❌ Invalid gameId provided to joinGame:', gameId, typeof gameId);
                throw new Error('Некорректный ID игры');
            }

            try {
                console.log('🚪 Joining game:', gameId);
                await gameService.joinGame(gameId);

                // Перезагружаем данные игры после присоединения
                await get().loadGame(gameId);

                console.log('✅ Successfully joined game');
            } catch (error: any) {
                console.error('❌ Failed to join game:', error);
                set({ connectionError: error.message || 'Не удалось присоединиться к игре' });
                throw error;
            }
        },

        // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Покинуть игру
        leaveGame: async () => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                console.log('🚪 Leaving game:', currentGame.id);
                await gameService.leaveGame(currentGame.id);
                get().clearGame();
                console.log('✅ Successfully left game');
            } catch (error: any) {
                console.error('❌ Failed to leave game:', error);
                set({ connectionError: error.message || 'Не удалось покинуть игру' });
                throw error;
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Очистка игры
        clearGame: () => {
            console.log('🧹 Clearing game state');
            set({
                currentGame: null,
                messages: [],
                chatMessages: [],
                playersOnline: [],
                players: [],
                activePlayers: [],
                currentScene: null,
                currentTurn: null,
                turnNumber: 1,
                initiativeOrder: [],
                lastDiceRoll: null,
                connectionError: null
            });
        },

        // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Подключение к игре
        connectToGame: async (gameId: string) => {
            // ✅ ИСПРАВЛЕНИЕ: Проверяем тип gameId
            if (!gameId || typeof gameId !== 'string') {
                console.error('❌ Invalid gameId provided to connectToGame:', gameId, typeof gameId);
                set({ connectionError: 'Некорректный ID игры' });
                return;
            }

            set({ isConnecting: true, connectionError: null });

            try {
                console.log('🔌 Connecting to game WebSocket:', gameId);
                await websocketService.connect(gameId);

                // Setup WebSocket event listeners
                websocketService.on('connected', (data) => {
                    console.log('✅ WebSocket connected:', data);
                    set({
                        isConnected: true,
                        isConnecting: false,
                        connectionError: null,
                        playersOnline: data.players_online || [],
                    });
                });

                websocketService.on('player_joined', (data) => {
                    console.log('👤 Player joined:', data);
                    const { playersOnline } = get();
                    const existingPlayer = playersOnline.find(p => p.user_id === data.user_id);

                    if (!existingPlayer) {
                        set({
                            playersOnline: [...playersOnline, data],
                            players: [...playersOnline, data],
                            activePlayers: [...playersOnline, data]
                        });
                    }
                });

                websocketService.on('player_left', (data) => {
                    console.log('👋 Player left:', data);
                    set((state) => ({
                        playersOnline: state.playersOnline.filter(p => p.user_id !== data.user_id),
                        players: state.players.filter(p => p.user_id !== data.user_id),
                        activePlayers: state.activePlayers.filter(p => p.user_id !== data.user_id)
                    }));
                });

                // ✅ ДОБАВЛЕНО: Обработка состояния игры
                websocketService.on('game_state', (data) => {
                    console.log('🎮 Game state received:', data);

                    const updates: any = {};

                    if (data.players) {
                        const playersArray = Array.isArray(data.players) ? data.players : Object.values(data.players);
                        updates.players = playersArray;
                        updates.activePlayers = playersArray;
                        updates.playersOnline = playersArray;
                    }

                    if (data.current_scene !== undefined) {
                        updates.currentScene = data.current_scene;
                    }

                    if (data.turn_info) {
                        updates.currentTurn = data.turn_info.current_player_id;
                        updates.turnNumber = data.turn_info.current_turn || 1;
                        updates.initiativeOrder = data.turn_info.initiative_order || [];
                    }

                    if (Object.keys(updates).length > 0) {
                        set(updates);
                    }
                });

                websocketService.on('chat_message', (data) => {
                    console.log('💬 Chat message received:', data);
                    get().addChatMessage({
                        id: Date.now().toString(),
                        type: 'chat',
                        content: data.content,
                        sender_name: data.sender_name,
                        sender_username: data.sender_username,
                        sender_id: data.sender_id,
                        timestamp: data.timestamp || new Date().toISOString()
                    });
                });

                websocketService.on('player_action', (data) => {
                    console.log('⚔️ Player action received:', data);
                    get().addMessage({
                        id: Date.now().toString(),
                        type: 'action',
                        content: `${data.character_name} выполняет: ${data.action}`,
                        sender_name: data.character_name,
                        sender_id: data.player_id,
                        timestamp: data.timestamp || new Date().toISOString()
                    });
                });

                websocketService.on('dice_roll', (data) => {
                    console.log('🎲 Dice roll received:', data);
                    set({ lastDiceRoll: data });
                    get().addMessage({
                        id: Date.now().toString(),
                        type: 'dice_roll',
                        content: `${data.character_name} бросает ${data.notation}: ${data.total}`,
                        sender_name: data.character_name,
                        sender_id: data.player_id,
                        timestamp: data.timestamp || new Date().toISOString(),
                        dice_roll: data
                    });
                });

                websocketService.on('system', (data) => {
                    console.log('📢 System message received:', data);
                    get().addMessage({
                        id: Date.now().toString(),
                        type: 'system',
                        content: data.message,
                        timestamp: data.timestamp || new Date().toISOString()
                    });
                });

                websocketService.on('error', (data) => {
                    console.error('❌ WebSocket error:', data);
                    set({
                        connectionError: data.message || 'Ошибка соединения',
                        isConnected: false,
                        isConnecting: false,
                    });
                });

            } catch (error: any) {
                console.error('❌ Failed to connect to game:', error);
                set({
                    isConnecting: false,
                    connectionError: error.message || 'Не удалось подключиться к игре',
                    isConnected: false,
                });
                throw error;
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Отключение от игры
        disconnectFromGame: async () => {
            try {
                console.log('🔌 Disconnecting from WebSocket');
                await websocketService.disconnect();
            } finally {
                set({
                    isConnected: false,
                    isConnecting: false,
                    connectionError: null,
                });
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Отправка сообщения
        sendMessage: (content: string, isOOC: boolean = false) => {
            const { selectedCharacterId, isConnected } = get();

            if (!isConnected) {
                console.warn('⚠️ Cannot send message: not connected to WebSocket');
                return;
            }

            try {
                websocketService.sendChatMessage(content, isOOC, selectedCharacterId || undefined);
                set({ chatInput: '' });
                console.log('💬 Message sent:', content.substring(0, 50));
            } catch (error: any) {
                console.error('❌ Failed to send message:', error);
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Отправка действия
        sendAction: (action: string) => {
            const { selectedCharacterId, isConnected } = get();

            if (!isConnected) {
                console.warn('⚠️ Cannot send action: not connected to WebSocket');
                return;
            }

            try {
                websocketService.sendPlayerAction(action, selectedCharacterId || undefined);
                console.log('⚔️ Action sent:', action.substring(0, 50));
            } catch (error: any) {
                console.error('❌ Failed to send action:', error);
            }
        },

        // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Бросок кубиков
        rollDice: async (
            notation: string,
            purpose?: string,
            advantage?: boolean,
            disadvantage?: boolean
        ) => {
            const { currentGame, selectedCharacterId, isConnected } = get();

            if (!currentGame) {
                console.warn('⚠️ Cannot roll dice: no current game');
                return;
            }

            if (!isConnected) {
                console.warn('⚠️ Cannot roll dice: not connected to WebSocket');
                return;
            }

            try {
                const rollData: DiceRollData = {
                    notation,
                    purpose,
                    character_id: selectedCharacterId || undefined,
                    advantage,
                    disadvantage
                };

                websocketService.sendDiceRoll(rollData);
                console.log('🎲 Dice roll sent:', notation);
            } catch (error: any) {
                console.error('❌ Failed to roll dice:', error);
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Добавление сообщения
        addMessage: (message: GameMessage) => {
            console.log('📝 Adding message to store:', message);
            set(state => ({
                messages: [...state.messages, message].slice(-50) // Последние 50 сообщений
            }));
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Добавление чат сообщения
        addChatMessage: (message: GameMessage) => {
            console.log('💬 Adding chat message to store:', message);
            set((state) => ({
                chatMessages: [...state.chatMessages, message].slice(-100) // Последние 100 сообщений
            }));
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Бросок инициативы
        rollInitiative: async (characterId: string) => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                console.log('🎯 Rolling initiative for character:', characterId);
                const result = await gameService.rollInitiative(currentGame.id, characterId);

                // Обновляем локальное состояние
                const { playersOnline } = get();
                const updatedPlayers = playersOnline.map(p =>
                    p.character_id === characterId ? { ...p, initiative: result.initiative } : p
                );

                set({
                    playersOnline: updatedPlayers,
                    players: updatedPlayers,
                    activePlayers: updatedPlayers
                });

                console.log('✅ Initiative rolled successfully:', result);
            } catch (error: any) {
                console.error('❌ Failed to roll initiative:', error);
            }
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Следующий ход
        nextTurn: async () => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                console.log('➡️ Moving to next turn');
                await gameService.nextTurn(currentGame.id);
                console.log('✅ Turn advanced successfully');
            } catch (error: any) {
                console.error('❌ Failed to advance turn:', error);
            }
        },

        // ✅ СОХРАНЕННЫЕ UI МЕТОДЫ
        setChatInput: (input: string) => set({ chatInput: input }),

        setTyping: (typing: boolean) => set({ isTyping: typing }),

        toggleCharacterSheets: () => set((state) => ({
            showCharacterSheets: !state.showCharacterSheets
        })),

        toggleDiceRoller: () => set((state) => ({
            showDiceRoller: !state.showDiceRoller
        })),

        selectCharacter: (characterId: string | null) => {
            console.log('👤 Selected character:', characterId);
            set({ selectedCharacterId: characterId });
        },

        updateCharacter: (characterId: string, updates: Partial<Character>) => {
            console.log('🔄 Updating character:', characterId, updates);
            set((state) => ({
                activeCharacters: state.activeCharacters.map(char =>
                    char.id === characterId ? { ...char, ...updates } : char
                ),
            }));
        },

        // ✅ СОХРАНЕННЫЙ МЕТОД: Очистка состояния игры
        clearGameState: () => {
            console.log('🧹 Clearing all game state');
            set({
                currentGame: null,
                isConnected: false,
                isConnecting: false,
                connectionError: null,
                messages: [],
                chatMessages: [],
                playersOnline: [],
                activeCharacters: [],
                currentScene: null,
                players: [],
                activePlayers: [],
                currentTurn: null,
                turnNumber: 1,
                initiativeOrder: [],
                lastDiceRoll: null,
                chatInput: '',
                isTyping: false,
                showCharacterSheets: false,
                showDiceRoller: false,
                selectedCharacterId: null,
            });
        },
    }))
);

// ✅ СОХРАНЕННЫЕ СЕЛЕКТОРЫ
export const useGameConnection = () => {
    const store = useGameStore();
    return {
        isConnected: store.isConnected,
        isConnecting: store.isConnecting,
        connectionError: store.connectionError,
        currentGame: store.currentGame,
    };
};

export const useGameChat = () => {
    const store = useGameStore();
    return {
        messages: store.messages,
        chatMessages: store.chatMessages,
        chatInput: store.chatInput,
        isTyping: store.isTyping,
        sendMessage: store.sendMessage,
        sendAction: store.sendAction,
        setChatInput: store.setChatInput,
        setTyping: store.setTyping,
    };
};

export const useGameActions = () => {
    const store = useGameStore();
    return {
        connectToGame: store.connectToGame,
        disconnectFromGame: store.disconnectFromGame,
        joinGame: store.joinGame,
        leaveGame: store.leaveGame,
        loadGame: store.loadGame,
        clearGame: store.clearGame,
        rollDice: store.rollDice,
        rollInitiative: store.rollInitiative,
        nextTurn: store.nextTurn,
        selectCharacter: store.selectCharacter,
        updateCharacter: store.updateCharacter,
        sendMessage: store.sendMessage,
        sendAction: store.sendAction,
    };
};

export const useGameUI = () => {
    const store = useGameStore();
    return {
        showCharacterSheets: store.showCharacterSheets,
        showDiceRoller: store.showDiceRoller,
        selectedCharacterId: store.selectedCharacterId,
        playersOnline: store.playersOnline,
        currentScene: store.currentScene,
        toggleCharacterSheets: store.toggleCharacterSheets,
        toggleDiceRoller: store.toggleDiceRoller,
    };
};

// ✅ ОБНОВЛЕННЫЙ ХУК ДЛЯ СОВМЕСТИМОСТИ
export const useGameData = () => {
    const store = useGameStore();
    return {
        currentGame: store.currentGame,
        isLoading: store.isConnecting,
        error: store.connectionError,
        connectionState: store.isConnected ? 'connected' : store.isConnecting ? 'connecting' : 'disconnected',
        isConnected: store.isConnected,
        isConnecting: store.isConnecting,
        connectionError: store.connectionError,
        messages: store.messages,
        chatMessages: store.chatMessages,
        playersOnline: store.playersOnline,
        activeCharacters: store.activeCharacters,
        currentScene: store.currentScene,
        selectedCharacterId: store.selectedCharacterId,
        // ✅ ПОЛЯ для GamePage
        players: store.players,
        activePlayers: store.activePlayers,
        currentTurn: store.currentTurn,
        turnNumber: store.turnNumber,
        initiativeOrder: store.initiativeOrder,
        lastDiceRoll: store.lastDiceRoll,
    };
};