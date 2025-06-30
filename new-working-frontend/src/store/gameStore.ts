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
    rollInitiative: (characterId: string) => Promise<void>;
    nextTurn: () => Promise<void>;
    addMessage: (message: GameMessage) => void;
    updatePlayersOnline: (players: GamePlayer[]) => void;
    setCurrentGame: (game: Game) => void;
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

        // ✅ НОВЫЙ МЕТОД: Загрузка игры
        loadGame: async (gameId: string) => {
            set({ isConnecting: true, connectionError: null });
            try {
                // Получаем информацию об игре
                const game = await gameService.getGame(gameId);
                set({ currentGame: game });

                // Подключаемся к игре
                await get().connectToGame(gameId);
            } catch (error: any) {
                console.error('Failed to load game:', error);
                set({
                    connectionError: error.message || 'Не удалось загрузить игру',
                    isConnecting: false,
                });
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

        // Connect to game
        connectToGame: async (gameId: string) => {
            set({ isConnecting: true, connectionError: null });

            try {
                await websocketService.connect(gameId);

                // Setup WebSocket event listeners
                websocketService.on('connected', (data) => {
                    const players = data.players || [];
                    set({
                        isConnected: true,
                        isConnecting: false,
                        connectionError: null,
                        playersOnline: players,
                        players: players,
                        activePlayers: players.filter((p: GamePlayer) => p.is_online),
                    });
                });

                websocketService.on('player_joined', (data) => {
                    const { playersOnline } = get();
                    const updatedPlayers = [...playersOnline, data.player];
                    set({
                        playersOnline: updatedPlayers,
                        players: updatedPlayers,
                        activePlayers: updatedPlayers.filter(p => p.is_online),
                    });
                });

                websocketService.on('player_left', (data) => {
                    const { playersOnline } = get();
                    const updatedPlayers = playersOnline.filter(p => p.user_id !== data.user_id);
                    set({
                        playersOnline: updatedPlayers,
                        players: updatedPlayers,
                        activePlayers: updatedPlayers.filter(p => p.is_online),
                    });
                });

                websocketService.on('chat_message', (data) => {
                    get().addMessage(data.message);
                });

                websocketService.on('dice_roll', (data) => {
                    set({ lastDiceRoll: data.result });
                    get().addMessage({
                        id: Date.now().toString(),
                        type: 'dice_roll',
                        content: `Бросил кости: ${data.result.notation} = ${data.result.total}`,
                        sender: data.player_name || 'Игрок',
                        timestamp: new Date().toISOString(),
                        dice_roll: data.result,
                    } as GameMessage);
                });

                websocketService.on('game_state_update', (data) => {
                    set({
                        currentScene: data.current_scene,
                        currentTurn: data.current_turn,
                        turnNumber: data.turn_number || get().turnNumber,
                    });
                });

                websocketService.on('initiative_update', (data) => {
                    set({
                        initiativeOrder: data.initiative_order || [],
                        currentTurn: data.current_turn,
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
                const result = await gameService.rollDice(currentGame.id, notation, selectedCharacterId);
                set({ lastDiceRoll: result });
            } catch (error) {
                console.error('Failed to roll dice:', error);
            }
        },

        // ✅ НОВЫЙ МЕТОД: Бросок инициативы
        rollInitiative: async (characterId: string) => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                await gameService.rollInitiative(currentGame.id, characterId);
                // Обновление инициативы придет через WebSocket
            } catch (error) {
                console.error('Failed to roll initiative:', error);
            }
        },

        // ✅ НОВЫЙ МЕТОД: Следующий ход
        nextTurn: async () => {
            const { currentGame } = get();
            if (!currentGame) return;

            try {
                await gameService.nextTurn(currentGame.id);
                // Обновление хода придет через WebSocket
            } catch (error) {
                console.error('Failed to advance turn:', error);
            }
        },

        // Add message to chat
        addMessage: (message: GameMessage) => {
            set(state => ({
                messages: [...state.messages, message],
            }));
        },

        // Update players online
        updatePlayersOnline: (players: GamePlayer[]) => {
            set({
                playersOnline: players,
                players: players,
                activePlayers: players.filter(p => p.is_online),
            });
        },

        // Set current game
        setCurrentGame: (game: Game) => {
            set({ currentGame: game });
        },

        // Set chat input
        setChatInput: (input: string) => {
            set({ chatInput: input });
        },

        // Set typing status
        setTyping: (typing: boolean) => {
            set({ isTyping: typing });
        },

        // Toggle character sheets visibility
        toggleCharacterSheets: () => {
            set(state => ({
                showCharacterSheets: !state.showCharacterSheets,
            }));
        },

        // Toggle dice roller visibility
        toggleDiceRoller: () => {
            set(state => ({
                showDiceRoller: !state.showDiceRoller,
            }));
        },

        // Select character
        selectCharacter: (characterId: string | null) => {
            set({ selectedCharacterId: characterId });
        },

        // Update character
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

// ✅ ОБНОВЛЕННЫЙ ХУКДЛЯ СОВМЕСТИМОСТИ
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