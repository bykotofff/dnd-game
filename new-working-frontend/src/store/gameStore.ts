// new-working-frontend/src/stores/gameStore.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import websocketService from '../services/websocketService';
import { gameService } from '../services/gameService';

export interface GameMessage {
    id: string;
    type: 'chat' | 'action' | 'system' | 'dice' | 'ai';
    content: string;
    author?: string;
    character?: string;
    timestamp: string;
    isOOC?: boolean;
    diceResult?: {
        notation: string;
        total: number;
        rolls: number[];
        purpose?: string;
    };
}

export interface GamePlayer {
    id: string;
    username: string;
    characterName?: string;
    characterId?: string;
    isOnline: boolean;
}

export interface GameState {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;

    // Game data
    currentGame: any | null;
    gameId: string | null;
    messages: GameMessage[];
    players: GamePlayer[];

    // Selected character
    selectedCharacterId: string | null;

    // UI state
    chatInput: string;

    // Actions
    connectToGame: (gameId: string, characterId?: string) => Promise<void>;
    disconnectFromGame: () => Promise<void>;
    sendMessage: (content: string, isOOC?: boolean) => void;
    sendAction: (action: string) => void;
    rollDice: (notation: string, purpose?: string, advantage?: boolean, disadvantage?: boolean) => void;
    setChatInput: (input: string) => void;
    setSelectedCharacter: (characterId: string | null) => void;
    clearMessages: () => void;
    addMessage: (message: GameMessage) => void;
}

export const useGameStore = create<GameState>()(
    devtools(
        (set, get) => ({
            // Initial state
            isConnected: false,
            isConnecting: false,
            connectionError: null,
            currentGame: null,
            gameId: null,
            messages: [],
            players: [],
            selectedCharacterId: null,
            chatInput: '',

            // Connect to game
            connectToGame: async (gameId: string, characterId?: string) => {
                const currentState = get();

                if (currentState.isConnecting || (currentState.isConnected && currentState.gameId === gameId)) {
                    console.log('Already connecting or connected to this game');
                    return;
                }

                try {
                    set({
                        isConnecting: true,
                        connectionError: null,
                        gameId,
                        selectedCharacterId: characterId || null,
                    });

                    console.log('🎮 Connecting to game:', gameId);
                    console.log('🎭 Selected character:', characterId);

                    // Load game data first
                    try {
                        const gameData = await gameService.getGame(gameId);
                        console.log('📊 Game data loaded:', gameData);
                        set({ currentGame: gameData });
                    } catch (error) {
                        console.error('⚠️ Failed to load game data, but continuing with WebSocket connection:', error);
                    }

                    // Set up WebSocket event handlers
                    websocketService.on('connected', () => {
                        console.log('✅ WebSocket connected successfully');
                        set({
                            isConnected: true,
                            isConnecting: false,
                            connectionError: null,
                        });
                    });

                    websocketService.on('disconnected', () => {
                        console.log('🔌 WebSocket disconnected');
                        set({
                            isConnected: false,
                            isConnecting: false,
                        });
                    });

                    websocketService.on('error', (data) => {
                        console.error('💥 WebSocket error:', data);
                        set({
                            connectionError: data.message || 'Ошибка соединения',
                            isConnected: false,
                            isConnecting: false,
                        });
                    });

                    websocketService.on('reconnected', () => {
                        console.log('🔄 WebSocket reconnected');
                        set({
                            isConnected: true,
                            connectionError: null,
                        });
                    });

                    // Game message handlers
                    websocketService.on('system', (data) => {
                        console.log('📢 System message:', data);
                        const message: GameMessage = {
                            id: Date.now().toString() + Math.random(),
                            type: 'system',
                            content: data.message || 'System message',
                            timestamp: data.timestamp || new Date().toISOString(),
                        };
                        get().addMessage(message);
                    });

                    websocketService.on('chat_message', (data) => {
                        console.log('💬 Chat message:', data);
                        const message: GameMessage = {
                            id: Date.now().toString() + Math.random(),
                            type: 'chat',
                            content: data.content || '',
                            author: data.character_name || data.player_name || 'Unknown',
                            character: data.character_name,
                            timestamp: data.timestamp || new Date().toISOString(),
                            isOOC: data.is_ooc || false,
                        };
                        get().addMessage(message);
                    });

                    websocketService.on('player_action', (data) => {
                        console.log('🎭 Player action:', data);
                        const message: GameMessage = {
                            id: Date.now().toString() + Math.random(),
                            type: 'action',
                            content: data.action || '',
                            author: data.character_name || data.player_name || 'Unknown',
                            character: data.character_name,
                            timestamp: data.timestamp || new Date().toISOString(),
                        };
                        get().addMessage(message);
                    });

                    websocketService.on('dice_roll', (data) => {
                        console.log('🎲 Dice roll:', data);
                        const message: GameMessage = {
                            id: Date.now().toString() + Math.random(),
                            type: 'dice',
                            content: `${data.character_name || 'Someone'} rolled ${data.notation}: ${data.total}`,
                            author: data.character_name || data.player_name || 'Unknown',
                            character: data.character_name,
                            timestamp: data.timestamp || new Date().toISOString(),
                            diceResult: {
                                notation: data.notation || '1d20',
                                total: data.total || 0,
                                rolls: data.rolls || [data.total || 0],
                                purpose: data.purpose,
                            },
                        };
                        get().addMessage(message);
                    });

                    websocketService.on('game_state', (data) => {
                        console.log('🎮 Game state update:', data);
                        set({ currentGame: data });

                        // Update players list if available
                        if (data.connected_players) {
                            const players: GamePlayer[] = data.connected_players.map((playerId: string) => ({
                                id: playerId,
                                username: playerId, // Could be improved with actual usernames
                                isOnline: true,
                            }));
                            set({ players });
                        }
                    });

                    websocketService.on('game_state_update', (data) => {
                        console.log('🔄 Game state update:', data);
                        set(state => ({
                            currentGame: { ...state.currentGame, ...data }
                        }));
                    });

                    // Connect to WebSocket
                    await websocketService.connect(gameId);

                    // Request initial game state and message history
                    setTimeout(() => {
                        if (websocketService.isConnected()) {
                            websocketService.requestGameState();
                            websocketService.requestMessageHistory(50);
                        }
                    }, 1000);

                } catch (error: any) {
                    console.error('💥 Failed to connect to game:', error);
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
                    websocketService.removeAllListeners();
                } finally {
                    set({
                        isConnected: false,
                        isConnecting: false,
                        connectionError: null,
                        currentGame: null,
                        gameId: null,
                        messages: [],
                        players: [],
                    });
                }
            },

            // Send chat message
            sendMessage: (content: string, isOOC: boolean = false) => {
                const { selectedCharacterId } = get();
                if (websocketService.isConnected()) {
                    websocketService.sendChatMessage(content, isOOC, selectedCharacterId || undefined);
                    set({ chatInput: '' });
                } else {
                    console.error('⚠️ Cannot send message: not connected to game');
                }
            },

            // Send player action
            sendAction: (action: string) => {
                const { selectedCharacterId } = get();
                if (websocketService.isConnected()) {
                    websocketService.sendPlayerAction(action, selectedCharacterId || undefined);
                } else {
                    console.error('⚠️ Cannot send action: not connected to game');
                }
            },

            // Roll dice
            rollDice: (
                notation: string,
                purpose?: string,
                advantage?: boolean,
                disadvantage?: boolean
            ) => {
                const { selectedCharacterId } = get();
                if (websocketService.isConnected()) {
                    websocketService.sendDiceRoll(
                        notation,
                        purpose,
                        selectedCharacterId || undefined,
                        advantage,
                        disadvantage
                    );
                } else {
                    console.error('⚠️ Cannot roll dice: not connected to game');
                }
            },

            // UI actions
            setChatInput: (input: string) => set({ chatInput: input }),

            setSelectedCharacter: (characterId: string | null) => {
                console.log('🎭 Setting selected character:', characterId);
                set({ selectedCharacterId: characterId });
            },

            clearMessages: () => set({ messages: [] }),

            addMessage: (message: GameMessage) => {
                set(state => ({
                    messages: [...state.messages, message].slice(-100) // Keep last 100 messages
                }));
            },
        }),
        {
            name: 'game-store',
        }
    )
);