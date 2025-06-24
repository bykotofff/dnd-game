import { io, Socket } from 'socket.io-client';
import { getFromStorage } from '@/utils';
import type { WebSocketMessage, GameMessage, DiceRollData, AuthTokens } from '@/types';

export type WebSocketEventType =
    | 'connected'
    | 'player_joined'
    | 'player_left'
    | 'chat_message'
    | 'player_action'
    | 'dice_roll'
    | 'dm_response'
    | 'character_updated'
    | 'roll_prompt'
    | 'players_list'
    | 'message_history'
    | 'error';

export interface WebSocketEventHandler {
    (data: any): void;
}

class WebSocketService {
    private socket: Socket | null = null;
    private gameId: string | null = null;
    private eventHandlers: Map<WebSocketEventType, WebSocketEventHandler[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    // Cleanup
    cleanup(): void {
        this.eventHandlers.clear();
        this.disconnect();
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService; Connect to game WebSocket
async connect(gameId: string): Promise<void> {
    if (this.socket?.connected) {
    await this.disconnect();
}

const tokens = getFromStorage<AuthTokens | null>('auth_tokens', null);
if (!tokens?.access_token) {
    throw new Error('No authentication token available');
}

const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

this.gameId = gameId;
this.socket = io(wsUrl, {
    path: `/api/ws/game/${gameId}`,
    query: {
        token: tokens.access_token,
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: this.maxReconnectAttempts,
    reconnectionDelay: this.reconnectDelay,
});

this.setupEventListeners();

return new Promise((resolve, reject) => {
    if (!this.socket) {
        reject(new Error('Failed to create socket'));
        return;
    }

    this.socket.on('connect', () => {
        console.log(`Connected to game ${gameId}`);
        this.reconnectAttempts = 0;
        resolve();
    });

    this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
    });

    this.socket.connect();
});
}

// Disconnect from WebSocket
async disconnect(): Promise<void> {
    if (this.socket) {
    this.socket.disconnect();
    this.socket = null;
    this.gameId = null;
    console.log('Disconnected from WebSocket');
}
}

// Setup event listeners
private setupEventListeners(): void {
    if (!this.socket) return;

// Connection events
this.socket.on('connect', () => {
    this.emit('connected', { gameId: this.gameId });
});

this.socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
    if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        this.emit('error', { message: 'Disconnected by server' });
    }
});

this.socket.on('reconnect', (attemptNumber) => {
    console.log(`Reconnected after ${attemptNumber} attempts`);
    this.emit('connected', { gameId: this.gameId, reconnected: true });
});

this.socket.on('reconnect_error', (error) => {
    console.error('Reconnection failed:', error);
    this.emit('error', { message: 'Failed to reconnect', error });
});

// Game events
this.socket.on('message', (message: WebSocketMessage) => {
    this.handleMessage(message);
});

// Error handling
this.socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    this.emit('error', error);
});
}

// Handle incoming messages
private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    console.log(`WebSocket message: ${type}`, data);

    switch (type) {
    case 'connected':
    case 'player_joined':
    case 'player_left':
    case 'chat_message':
    case 'player_action':
    case 'dice_roll':
    case 'dm_response':
    case 'character_updated':
    case 'roll_prompt':
    case 'players_list':
    case 'message_history':
    case 'error':
        this.emit(type as WebSocketEventType, data);
        break;
    default:
        console.warn('Unknown message type:', type);
    }
}

// Send chat message
sendChatMessage(content: string, isOOC: boolean = false, characterId?: string): void {
    this.sendMessage('chat_message', {
        content,
        is_ooc: isOOC,
        character_id: characterId,
    });
}

// Send player action
sendPlayerAction(action: string, characterId?: string): void {
    this.sendMessage('player_action', {
        action,
        character_id: characterId,
    });
}

// Send dice roll
sendDiceRoll(
    diceNotation: string,
    purpose?: string,
    characterId?: string,
    advantage?: boolean,
    disadvantage?: boolean,
    modifiers?: Record<string, number>
): void {
    this.sendMessage('dice_roll', {
        dice_notation: diceNotation,
        purpose,
        character_id: characterId,
        advantage,
        disadvantage,
        modifiers,
    });
}

// Update character
updateCharacter(characterId: string, updates: Record<string, any>): void {
    this.sendMessage('character_update', {
        character_id: characterId,
        updates,
    });
}

// Send game command
sendGameCommand(command: string, args?: Record<string, any>): void {
    this.sendMessage('game_command', {
        command,
        args: args || {},
    });
}

// Generic message sender
private sendMessage(type: string, data: any): void {
    if (!this.socket?.connected) {
    console.error('WebSocket not connected');
    this.emit('error', { message: 'Not connected to game' });
    return;
}

const message = {
    type,
    data,
    timestamp: new Date().toISOString(),
};

this.socket.emit('message', message);
}

// Event handler management
on(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
    this.eventHandlers.set(event, []);
}
this.eventHandlers.get(event)!.push(handler);
}

off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }
}

private emit(event: WebSocketEventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in WebSocket event handler for ${event}:`, error);
            }
        });
    }
}

// Connection status
isConnected(): boolean {
    return this.socket?.connected || false;
}

getGameId(): string | null {
    return this.gameId;
}

// Utility methods
getPlayersOnline(): void {
    this.sendGameCommand('get_players');
}

saveGameState(): void {
    this.sendGameCommand('save_game');
}

loadGameState(): void {
    this.sendGameCommand('load_game');
}
}

//