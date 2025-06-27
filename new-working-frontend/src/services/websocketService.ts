import { getFromStorage } from '@/utils';
import type { AuthTokens } from '@/types';

// WebSocket сообщения
export interface WebSocketMessage {
    type: 'chat' | 'action' | 'roll' | 'join' | 'leave' | 'initiative' | 'ai_response' | 'game_state_update' | 'player_update' | 'system';
    data: any;
    sender_id?: string;
    timestamp: string;
    game_id?: string;
}

// События WebSocket
export type WebSocketEventType =
    | 'connected'
    | 'disconnected'
    | 'message'
    | 'player_joined'
    | 'player_left'
    | 'dice_rolled'
    | 'initiative_rolled'
    | 'turn_changed'
    | 'scene_updated'
    | 'ai_response'
    | 'error';

export type WebSocketEventHandler = (data?: any) => void;

// Состояние подключения
export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error',
}

// Конфигурация WebSocket
interface WebSocketConfig {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private reconnectAttempts: number = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private gameId: string | null = null;
    private isManualClose: boolean = false;

    constructor() {
        this.config = {
            url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
            reconnectInterval: 3000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000,
        };

        // Инициализируем Map с пустыми Set для каждого типа события
        const eventTypes: WebSocketEventType[] = [
            'connected', 'disconnected', 'message', 'player_joined',
            'player_left', 'dice_rolled', 'initiative_rolled',
            'turn_changed', 'scene_updated', 'ai_response', 'error'
        ];

        eventTypes.forEach(type => {
            this.eventHandlers.set(type, new Set());
        });
    }

    // Подключение к игровой сессии
    async connect(gameId: string): Promise<void> {
        if (this.connectionState === ConnectionState.CONNECTED && this.gameId === gameId) {
            return; // Уже подключены к этой игре
        }

        this.gameId = gameId;
        this.isManualClose = false;

        await this.disconnect(); // Отключаемся от предыдущей игры
        await this.establishConnection();
    }

    // Установка подключения
    private async establishConnection(): Promise<void> {
        if (!this.gameId) {
            throw new Error('Game ID is required for connection');
        }

        return new Promise((resolve, reject) => {
            try {
                this.setConnectionState(ConnectionState.CONNECTING);

                // Получаем токен авторизации
                const tokens = getFromStorage<AuthTokens | null>('auth_tokens', null);
                if (!tokens?.access_token) {
                    throw new Error('Authentication required');
                }

                // Создаем WebSocket подключение
                const wsUrl = `${this.config.url}/api/ws/game/${this.gameId}?token=${tokens.access_token}`;
                this.ws = new WebSocket(wsUrl);

                // Обработчики событий WebSocket
                this.ws.onopen = () => {
                    console.log(`WebSocket connected to game ${this.gameId}`);
                    this.setConnectionState(ConnectionState.CONNECTED);
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                        this.emit('error', { type: 'parse_error', error });
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.setConnectionState(ConnectionState.DISCONNECTED);
                    this.stopHeartbeat();
                    this.emit('disconnected', { code: event.code, reason: event.reason });

                    // Автоматическое переподключение если не был ручной разрыв
                    if (!this.isManualClose && this.reconnectAttempts < this.config.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.setConnectionState(ConnectionState.ERROR);
                    this.emit('error', { type: 'connection_error', error });
                    reject(error);
                };

            } catch (error) {
                this.setConnectionState(ConnectionState.ERROR);
                this.emit('error', { type: 'setup_error', error });
                reject(error);
            }
        });
    }

    // Планирование переподключения
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval * this.reconnectAttempts;

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.setConnectionState(ConnectionState.RECONNECTING);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.establishConnection();
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, delay);
    }

    // Отключение
    async disconnect(): Promise<void> {
        this.isManualClose = true;
        this.gameId = null;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopHeartbeat();

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'Manual disconnect');
        }

        this.ws = null;
        this.setConnectionState(ConnectionState.DISCONNECTED);
    }

    // Отправка сообщения
    send(type: string, data: any): void {
        if (!this.isConnected()) {
            console.warn('WebSocket not connected, message not sent:', type, data);
            return;
        }

        const message: WebSocketMessage = {
            type: type as any,
            data,
            timestamp: new Date().toISOString(),
            game_id: this.gameId || undefined,
        };

        try {
            this.ws!.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.emit('error', { type: 'send_error', error });
        }
    }

    // Отправка чат сообщения
    sendChatMessage(content: string): void {
        this.send('chat', { content });
    }

    // Отправка действия
    sendAction(action: string, details?: any): void {
        this.send('action', { action, ...details });
    }

    // Бросок костей
    sendDiceRoll(notation: string, purpose?: string): void {
        this.send('roll', { notation, purpose });
    }

    // Инициатива
    sendInitiativeRoll(characterId: string): void {
        this.send('initiative', { character_id: characterId });
    }

    // Обработка входящих сообщений
    private handleMessage(message: WebSocketMessage): void {
        console.log('Received WebSocket message:', message);

        // Эмитируем общее событие message
        this.emit('message', message);

        // Эмитируем специфические события в зависимости от типа
        switch (message.type) {
            case 'chat':
            case 'action':
            case 'system':
                this.emit('message', message);
                break;

            case 'roll':
                this.emit('dice_rolled', message.data);
                break;

            case 'initiative':
                this.emit('initiative_rolled', message.data);
                break;

            case 'join':
                this.emit('player_joined', message.data);
                break;

            case 'leave':
                this.emit('player_left', message.data);
                break;

            case 'ai_response':
                this.emit('ai_response', message.data);
                break;

            case 'game_state_update':
                if (message.data.scene_description) {
                    this.emit('scene_updated', message.data);
                }
                if (message.data.current_turn) {
                    this.emit('turn_changed', message.data);
                }
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // Подписка на события
    on(event: WebSocketEventType, handler: WebSocketEventHandler): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.add(handler);
        }
    }

    // Отписка от событий
    off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    // Эмит события
    private emit(event: WebSocketEventType, data?: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }

    // Установка состояния подключения
    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            console.log('WebSocket state changed:', state);
        }
    }

    // Heartbeat для поддержания соединения
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Геттеры
    isConnected(): boolean {
        return this.connectionState === ConnectionState.CONNECTED &&
            this.ws?.readyState === WebSocket.OPEN;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getCurrentGameId(): string | null {
        return this.gameId;
    }

    getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }
}

// Экспорт синглтона
export const websocketService = new WebSocketService();
export default websocketService;