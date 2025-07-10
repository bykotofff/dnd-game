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
    loadGame: (gameId: string) => Promise<void>;
    clearGame: () => void;
    sendMessage: (content: string, isOOC?: boolean) => void;
    sendAction: (action: string) => void;
    rollDice: (notation: string, purpose?: string, advantage?: boolean, disadvantage?: boolean) => Promise<void>;

    // ✅ НОВЫЙ МЕТОД: Добавление сообщения
    addMessage: (message: GameMessage) => void;

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
        loadGame: async (gameId: string) => {
            try {
                console.log('Loading game:', gameId);
                const game = await gameService.getGame(gameId);

                set({
                    currentGame: game,
                    connectionError: null,
                });

                console.log('Game loaded successfully:', game);
                return game;
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

        // ✅ УЛУЧШЕННОЕ ПОДКЛЮЧЕНИЕ К ИГРЕ
        connectToGame: async (gameId: string) => {
            const { currentGame } = get();

            set({ isConnecting: true, connectionError: null });

            try {
                // ✅ Сначала загружаем игру, если её нет
                let game = currentGame;
                if (!game) {
                    console.log('No game loaded, loading first...');
                    try {
                        game = await get().loadGame(gameId);
                    } catch (loadError) {
                        console.log('Failed to load game, will try WebSocket anyway');
                        // Продолжаем попытку подключения к WebSocket даже если не удалось загрузить игру
                    }
                }

                // Затем подключаемся к WebSocket
                await websocketService.connect(gameId);

                // Setup WebSocket event listeners
                websocketService.on('connected', (data) => {
                    console.log('WebSocket connected, received data:', data);
                    const players = data.players_online || [];
                    set({
                        isConnected: true,
                        isConnecting: false,
                        connectionError: null,
                        playersOnline: players,
                        players: players,
                        activePlayers: players.filter((p: GamePlayer) => p.is_online),
                    });

                    // ✅ Если игра всё ещё не загружена, попробуем ещё раз
                    const { currentGame: currentGameAfterWS } = get();
                    if (!currentGameAfterWS && gameId) {
                        console.log('Game still not loaded after WebSocket, attempting to load...');
                        get().loadGame(gameId).catch((loadError) => {
                            console.error('Failed to load game after WebSocket connection:', loadError);
                            // Не считаем это критической ошибкой, так как WebSocket уже подключен
                        });
                    }
                });

                websocketService.on('player_joined', (data) => {
                    const { playersOnline } = get();
                    const updatedPlayers = [...playersOnline];
                    const existingIndex = updatedPlayers.findIndex(p => p.user_id === data.user_id);

                    if (existingIndex >= 0) {
                        updatedPlayers[existingIndex] = { ...updatedPlayers[existingIndex], is_online: true };
                    } else {
                        updatedPlayers.push(data);
                    }

                    set({
                        playersOnline: updatedPlayers,
                        players: updatedPlayers,
                        activePlayers: updatedPlayers.filter((p: GamePlayer) => p.is_online),
                    });
                });

                websocketService.on('player_left', (data) => {
                    const { playersOnline } = get();
                    const updatedPlayers = playersOnline.map(p =>
                        p.user_id === data.user_id ? { ...p, is_online: false } : p
                    );

                    set({
                        playersOnline: updatedPlayers,
                        players: updatedPlayers,
                        activePlayers: updatedPlayers.filter((p: GamePlayer) => p.is_online),
                    });
                });

                // ✅ НОВЫЙ: Обработчик чат сообщений
                websocketService.on('chat_message', (data) => {
                    console.log('Received chat message:', data);
                    get().addMessage({
                        id: `chat-${Date.now()}`,
                        content: data.content,
                        message_type: 'chat',
                        author: data.sender_name,
                        timestamp: data.timestamp,
                        is_ooc: data.is_ooc || false,
                    });
                });

                // ✅ НОВЫЙ: Обработчик действий игрока
                websocketService.on('player_action', (data) => {
                    console.log('Received player action:', data);
                    get().addMessage({
                        id: `action-${Date.now()}`,
                        content: data.action,
                        message_type: 'action',
                        author: data.player_name,
                        timestamp: data.timestamp,
                        is_ooc: false,
                    });
                });

                // ✅ НОВЫЙ: Обработчик ответов ИИ
                websocketService.on('ai_response', (data) => {
                    console.log('Received AI response:', data);
                    get().addMessage({
                        id: `ai-${Date.now()}`,
                        content: data.message,
                        message_type: 'dm',
                        author: data.sender_name || 'ИИ Мастер',
                        timestamp: data.timestamp,
                        is_ooc: false,
                    });
                });

                websocketService.on('message', (data) => {
                    get().addMessage(data);
                });

                websocketService.on('dice_rolled', (data) => {
                    set({ lastDiceRoll: data });
                    // Также добавляем сообщение в чат
                    get().addMessage({
                        id: `dice-${Date.now()}`,
                        content: `🎲 ${data.notation}: ${data.result}`,
                        message_type: 'dice',
                        author: data.player_name || 'Unknown',
                        character_name: data.character_name,
                        timestamp: new Date().toISOString(),
                        is_ooc: false,
                    });
                });

                websocketService.on('dice_roll', (data) => {
                    set({ lastDiceRoll: data });
                    // Также добавляем сообщение в чат
                    get().addMessage({
                        id: `dice-${Date.now()}`,
                        content: `🎲 ${data.notation || data.result}`,
                        message_type: 'dice',
                        author: data.player_name || 'Unknown',
                        timestamp: data.timestamp || new Date().toISOString(),
                        is_ooc: false,
                    });
                });

                websocketService.on('game_updated', (data) => {
                    set({
                        currentScene: data.current_scene,
                        currentTurn: data.current_turn,
                        turnNumber: data.turn_number || get().turnNumber,
                    });
                });

                websocketService.on('error', (data) => {
                    console.error('Game WebSocket error:', data);
                    set({
                        connectionError: data.message || 'Ошибка соединения',
                        isConnected: false,
                        isConnecting: false,
                    });
                });

                websocketService.on('disconnected', () => {
                    set({
                        isConnected: false,
                        isConnecting: false,
                    });
                });

                // ✅ НОВЫЙ: Обработчик ответов ИИ Мастера
                websocketService.on('ai_response', (data: any) => {
                    console.log('Received AI response:', data);

                    const aiMessage: GameMessage = {
                        id: `ai-${Date.now()}`,
                        type: 'dm' as const,
                        author: data.sender_name || 'ИИ Мастер',
                        content: data.message,
                        timestamp: new Date(data.timestamp || Date.now()),
                        metadata: {
                            in_response_to: data.in_response_to,
                            responding_to_player: data.responding_to_player,
                            is_fallback: data.is_fallback
                        }
                    };

                    get().addMessage(aiMessage);
                });

                // ✅ УЛУЧШЕННЫЙ: Обработчик запросов на бросок кубиков
                websocketService.on('roll_request', (data: any) => {
                    console.log('Received roll request:', data);

                    // Создаем более простое сообщение для чата
                    const rollRequestMessage: GameMessage = {
                        id: `roll-request-${Date.now()}`,
                        type: 'system' as const,
                        author: data.sender_name || 'ИИ Мастер',
                        content: data.message,
                        timestamp: new Date(data.timestamp || Date.now()),
                        metadata: {
                            requires_dice_roll: data.requires_dice_roll,
                            roll_type: data.roll_type,
                            ability_or_skill: data.ability_or_skill,
                            skill_display: data.skill_display,
                            dice_notation: data.dice_notation,
                            modifier: data.modifier,
                            advantage: data.advantage,
                            disadvantage: data.disadvantage,
                            original_action: data.original_action,
                            requesting_player: data.requesting_player,
                            auto_modifier: data.auto_modifier
                        }
                    };

                    get().addMessage(rollRequestMessage);

                    // Автоматически открываем роллер кубиков
                    set({ showDiceRoller: true });

                    // Показываем уведомление только с названием навыка
                    console.log(`Требуется проверка: ${data.skill_display}`);
                });

                // ✅ УЛУЧШЕННЫЙ: Обработчик результатов проверок кубиков
                websocketService.on('dice_check_result', (data: any) => {
                    console.log('Received dice check result:', data);

                    // Показываем результат с детальной информацией о броске
                    const checkResultMessage: GameMessage = {
                        id: `check-result-${Date.now()}`,
                        type: 'dm' as const,
                        author: data.sender_name || 'ИИ Мастер',
                        content: data.message,
                        timestamp: new Date(data.timestamp || Date.now()),
                        metadata: {
                            is_dice_check_result: data.is_dice_check_result,
                            base_roll: data.base_roll,
                            modifier: data.modifier,
                            final_total: data.final_total,
                            success: data.success,
                            original_action: data.original_action,
                            player_name: data.player_name,
                            skill_display: data.skill_display
                        }
                    };

                    get().addMessage(checkResultMessage);

                    // Показываем детальный результат в консоли
                    const successIcon = data.success ? '🎯' : '❌';
                    const resultText = data.success ? 'Успех!' : 'Неудача';
                    const rollDetails = `${data.base_roll}+${data.modifier}=${data.final_total}`;
                    console.log(`${successIcon} ${resultText} ${data.skill_display}: ${rollDetails}`);
                });

                // ✅ УЛУЧШЕННЫЙ: Обработчик обычных бросков кубиков
                websocketService.on('dice_roll', (data: any) => {
                    console.log('Received dice roll:', data);

                    // Различаем проверки навыков и обычные броски
                    let content: string;
                    if (data.is_skill_check) {
                        // Для проверок навыков показываем только базовый результат d20
                        content = `🎲 **${data.player_name}** бросил d20: **${data.result.total}** *(${data.purpose})*`;
                    } else {
                        // Для обычных бросков показываем полный результат
                        content = `🎲 **${data.player_name}** бросил ${data.notation}: **${data.result.total}**`;
                        if (data.result.details) {
                            content += ` *(${data.result.details})*`;
                        }
                    }

                    const diceMessage: GameMessage = {
                        id: `dice-${Date.now()}`,
                        type: 'dice' as const,
                        author: data.player_name,
                        content: content,
                        timestamp: new Date(data.timestamp || Date.now()),
                        metadata: {
                            notation: data.notation,
                            result: data.result,
                            player_id: data.player_id,
                            purpose: data.purpose,
                            is_skill_check: data.is_skill_check
                        }
                    };

                    get().addMessage(diceMessage);

                    // Сохраняем последний бросок в стор
                    set({
                        lastDiceRoll: {
                            notation: data.notation,
                            result: data.result,
                            timestamp: data.timestamp,
                            player: data.player_name,
                            is_skill_check: data.is_skill_check
                        }
                    });
                });

            } catch (error: any) {
                console.error('Failed to connect to game:', error);
                set({
                    isConnecting: false,
                    connectionError: error.message || 'Не удалось подключиться к игре',
                    isConnected: false,
                });
                throw error;
            }
        },

        // ✅ НОВЫЙ МЕТОД: Присоединение к игре
        joinGame: async (gameId: string) => {
            try {
                await gameService.joinGame(gameId);
                await get().connectToGame(gameId);
            } catch (error: any) {
                console.error('Failed to join game:', error);
                set({ connectionError: error.message || 'Не удалось присоединиться к игре' });
            }
        },

        // ✅ НОВЫЙ МЕТОД: Покинуть игру
        leaveGame: async () => {
            try {
                const { currentGame } = get();
                if (currentGame) {
                    await gameService.leaveGame(currentGame.id);
                }
                await get().disconnectFromGame();
            } catch (error: any) {
                console.error('Failed to leave game:', error);
            }
        },

        // ✅ НОВЫЙ МЕТОД: Очистка игры
        clearGame: () => {
            get().clearGameState();
        },

        // Disconnect from game
        disconnectFromGame: async () => {
            try {
                await websocketService.disconnect();
            } finally {
                set({
                    isConnected: false,
                    isConnecting: false,
                    connectionError: null,
                });
            }
        },

        // Send chat message
        sendMessage: (content: string, isOOC: boolean = false) => {
            const { selectedCharacterId } = get();
            websocketService.sendChatMessage(content, isOOC, selectedCharacterId || undefined);
            set({ chatInput: '' });
        },

        // Send player action
        sendAction: (action: string) => {
            const { selectedCharacterId } = get();
            websocketService.sendPlayerAction(action, selectedCharacterId || undefined);
        },

        // Roll dice
        rollDice: async (
            notation: string,
            purpose?: string,
            advantage?: boolean,
            disadvantage?: boolean
        ) => {
            const { currentGame, selectedCharacterId } = get();
            if (!currentGame) return;

            try {
                websocketService.sendDiceRoll(notation, purpose, selectedCharacterId || undefined, advantage, disadvantage);
            } catch (error: any) {
                console.error('Failed to roll dice:', error);
            }
        },

        // ✅ НОВЫЙ МЕТОД: Добавление сообщения
        addMessage: (message: GameMessage) => {
            set(state => ({
                messages: [...state.messages, message]
            }));
        },

        // ✅ НОВЫЕ МЕТОДЫ для инициативы и управления игрой
        rollInitiative: async (characterId: string) => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                const result = await gameService.rollInitiative(currentGame.id, characterId);
                // Обновляем локальное состояние
                const { playersOnline } = get();
                const updatedPlayers = playersOnline.map(p =>
                    p.character_id === characterId ? { ...p, initiative: result.initiative } : p
                );

                set({
                    playersOnline: updatedPlayers,
                    players: updatedPlayers,
                    activePlayers: updatedPlayers.filter(p => p.is_online),
                    initiativeOrder: result.initiative_order || get().initiativeOrder,
                });
            } catch (error: any) {
                console.error('Failed to roll initiative:', error);
            }
        },

        nextTurn: async () => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                const result = await gameService.nextTurn(currentGame.id);
                set({
                    currentTurn: result.current_turn,
                    turnNumber: result.turn_number,
                    initiativeOrder: result.initiative_order || get().initiativeOrder,
                });
            } catch (error: any) {
                console.error('Failed to advance turn:', error);
            }
        },

        // UI Actions
        setChatInput: (input: string) => {
            set({ chatInput: input });
        },

        setTyping: (typing: boolean) => {
            set({ isTyping: typing });
        },

        toggleCharacterSheets: () => {
            set(state => ({ showCharacterSheets: !state.showCharacterSheets }));
        },

        toggleDiceRoller: () => {
            set(state => ({ showDiceRoller: !state.showDiceRoller }));
        },

        selectCharacter: (characterId: string | null) => {
            set({ selectedCharacterId: characterId });
        },

        updateCharacter: (characterId: string, updates: Partial<Character>) => {
            set(state => ({
                activeCharacters: state.activeCharacters.map(char =>
                    char.id === characterId ? { ...char, ...updates } : char
                ),
            }));
        },

        // Clear game state
        clearGameState: () => {
            set({
                currentGame: null,
                isConnected: false,
                isConnecting: false,
                connectionError: null,
                messages: [],
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

// Selector hooks
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
        playersOnline: store.playersOnline,
        activeCharacters: store.activeCharacters,
        currentScene: store.currentScene,
        selectedCharacterId: store.selectedCharacterId,
        // ✅ НОВЫЕ ПОЛЯ для GamePage
        players: store.players,
        activePlayers: store.activePlayers,
        currentTurn: store.currentTurn,
        turnNumber: store.turnNumber,
        initiativeOrder: store.initiativeOrder,
        lastDiceRoll: store.lastDiceRoll,
    };
};