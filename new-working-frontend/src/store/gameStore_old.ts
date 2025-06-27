import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { websocketService } from '@/services/websocketService';
import type { Game, GameMessage, Character, DiceRollData } from '@/types';

interface GameState {
    // Current game state
    currentGame: Game | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;

    // Game data
    messages: GameMessage[];
    playersOnline: string[];
    activeCharacters: Character[];
    currentScene: string | null;

    // UI state
    chatInput: string;
    isTyping: boolean;
    showCharacterSheets: boolean;
    showDiceRoller: boolean;
    selectedCharacterId: string | null;

    // Actions
    connectToGame: (gameId: string) => Promise<void>;
    disconnectFromGame: () => Promise<void>;
    sendMessage: (content: string, isOOC?: boolean) => void;
    sendAction: (action: string) => void;
    rollDice: (notation: string, purpose?: string, advantage?: boolean, disadvantage?: boolean) => void;
    addMessage: (message: GameMessage) => void;
    updatePlayersOnline: (players: string[]) => void;
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
        chatInput: '',
        isTyping: false,
        showCharacterSheets: false,
        showDiceRoller: false,
        selectedCharacterId: null,

        // Connect to game
        connectToGame: async (gameId: string) => {
            set({ isConnecting: true, connectionError: null });

            try {
                await websocketService.connect(gameId);

                // Setup WebSocket event listeners
                websocketService.on('connected', (data) => {
                    set({
                        isConnected: true,
                        isConnecting: false,
                        connectionError: null,
                        playersOnline: data.players_online || [],
                    });
                });

                websocketService.on('player_joined', (data) => {
                    const { playersOnline } = get();
                    set({
                        playersOnline: data.players_online || playersOnline,
                    });
                });

                websocketService.on('player_left', (data) => {
                    const { playersOnline } = get();
                    set({
                        playersOnline: data.players_online || playersOnline,
                    });
                });

                websocketService.on('chat_message', (data) => {
                    get().addMessage(data);
                });

                websocketService.on('player_action', (data) => {
                    get().addMessage(data);
                });

                websocketService.on('dice_roll', (data) => {
                    get().addMessage(data);
                });

                websocketService.on('dm_response', (data) => {
                    get().addMessage(data);
                });

                websocketService.on('message_history', (data) => {
                    set({ messages: data.messages || [] });
                });

                websocketService.on('character_updated', (data) => {
                    const { updateCharacter } = get();
                    updateCharacter(data.character_id, data.updates);
                });

                websocketService.on('roll_prompt', (data) => {
                    // Handle dice roll prompt from DM
                    console.log('Roll prompt:', data);
                    set({ showDiceRoller: true });
                });

                websocketService.on('players_list', (data) => {
                    set({ playersOnline: data.players || [] });
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
        rollDice: (
            notation: string,
            purpose?: string,
            advantage?: boolean,
            disadvantage?: boolean
        ) => {
            const { selectedCharacterId } = get();
            websocketService.sendDiceRoll(
                notation,
                purpose,
                selectedCharacterId || undefined,
                advantage,
                disadvantage
            );
        },

        // Add message to chat
        addMessage: (message: GameMessage) => {
            set((state) => ({
                messages: [...state.messages, message].slice(-100), // Keep last 100 messages
            }));
        },

        // Update online players
        updatePlayersOnline: (players: string[]) => {
            set({ playersOnline: players });
        },

        // Set current game
        setCurrentGame: (game: Game) => {
            set({
                currentGame: game,
                currentScene: game.current_scene,
            });
        },

        // Set chat input
        setChatInput: (input: string) => {
            set({ chatInput: input });
        },

        // Set typing status
        setTyping: (typing: boolean) => {
            set({ isTyping: typing });
        },

        // Toggle character sheets panel
        toggleCharacterSheets: () => {
            set((state) => ({
                showCharacterSheets: !state.showCharacterSheets,
            }));
        },

        // Toggle dice roller panel
        toggleDiceRoller: () => {
            set((state) => ({
                showDiceRoller: !state.showDiceRoller,
            }));
        },

        // Select character
        selectCharacter: (characterId: string | null) => {
            set({ selectedCharacterId: characterId });
        },

        // Update character
        updateCharacter: (characterId: string, updates: Partial<Character>) => {
            set((state) => ({
                activeCharacters: state.activeCharacters.map((char) =>
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
        rollDice: store.rollDice,
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