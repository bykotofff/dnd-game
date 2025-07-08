// services/websocketService.ts - WebSocket сервис с поддержкой запроса состояния игры

export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error'
}

export interface WebSocketEventHandlers {
    connected?: (data: any) => void;
    player_joined?: (data: any) => void;
    player_left?: (data: any) => void;
    chat_message?: (data: any) => void;
    dice_roll?: (data: any) => void;
    game_state_update?: (data: any) => void;
    initiative_update?: (data: any) => void;
    scene_update?: (data: any) => void;
    character_update?: (data: any) => void;
    ai_response?: (data: any) => void;
    message_history?: (data: any) => void;
    error?: (data: any) => void;
    disconnected?: () => void;
    reconnected?: () => void;
}

export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp?: string;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

class WebSocketService {
    private socket: WebSocket | null = null;
    private gameId: string | null = null;
    private eventHandlers: WebSocketEventHandlers = {};
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private heartbeatInterval = 30000; // 30 секунд

    // Правильное получение токена
    private getAuthToken(): string | null {
        try {
            // Сначала пробуем получить токены из нового формата (используется в apiService)
            const authTokensString = localStorage.getItem('auth_tokens');
            if (authTokensString) {
                const authTokens: AuthTokens = JSON.parse(authTokensString);
                return authTokens.access_token;
            }

            // Резервный вариант - старый формат
            const singleToken = localStorage.getItem('auth_token');
            if (singleToken) {
                return singleToken;
            }

            // Проверяем Zustand persist хранилище
            const authStoreString = localStorage.getItem('auth-store');
            if (authStoreString) {
                const authStore = JSON.parse(authStoreString);
                if (authStore.state?.user?.access_token) {
                    return authStore.state.user.access_token;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    // Правильное получение WebSocket URL
    private getWebSocketUrl(gameId: string, token: string): string {
        // Проверяем полный WS URL (VITE_WS_URL)
        const wsUrl = import.meta.env.VITE_WS_URL;
        if (wsUrl) {
            return `${wsUrl}/ws/game/${gameId}?token=${encodeURIComponent(token)}`;
        }

        // Проверяем VITE_WS_HOST (только host:port)
        const wsHost = import.meta.env.VITE_WS_HOST;
        if (wsHost) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${wsHost}/ws/game/${gameId}?token=${encodeURIComponent(token)}`;
        }

        // Проверяем API URL и извлекаем хост
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
            try {
                const url = new URL(apiUrl);
                const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${protocol}//${url.host}/ws/game/${gameId}?token=${encodeURIComponent(token)}`;
            } catch (error) {
                console.warn('Failed to parse VITE_API_URL:', apiUrl);
            }
        }

        // Резервный вариант - предполагаем что backend на том же хосте, но порт 8000
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const currentHost = window.location.hostname;
        return `${protocol}//${currentHost}:8000/ws/game/${gameId}?token=${encodeURIComponent(token)}`;
    }

    // Получить текущее состояние подключения
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    // Получить ID текущей игры
    getCurrentGameId(): string | null {
        return this.gameId;
    }

    // Подключение к игре
    async connect(gameId: string): Promise<void> {
        if (this.socket && this.socket.readyState === WebSocket.OPEN && this.gameId === gameId) {
            console.log('Already connected to game:', gameId);
            return;
        }

        // Отключаемся от предыдущего соединения
        if (this.socket) {
            await this.disconnect();
        }

        this.gameId = gameId;
        this.setConnectionState(ConnectionState.CONNECTING);

        return new Promise((resolve, reject) => {
            try {
                const token = this.getAuthToken();
                if (!token) {
                    throw new Error('No authentication token found. Please log in first.');
                }

                const wsUrl = this.getWebSocketUrl(gameId, token);
                console.log('Connecting to WebSocket:', wsUrl);

                this.socket = new WebSocket(wsUrl);
                this.setupEventListeners(resolve, reject);

            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                this.setConnectionState(ConnectionState.ERROR);
                reject(error);
            }
        });
    }

    // Настройка обработчиков событий WebSocket
    private setupEventListeners(resolve: () => void, reject: (error: Error) => void): void {
        if (!this.socket) return;

        this.socket.onopen = () => {
            console.log('WebSocket connection opened');
            this.setConnectionState(ConnectionState.CONNECTED);
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            resolve();
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            this.setConnectionState(ConnectionState.DISCONNECTED);
            this.stopHeartbeat();
            this.handleMessage('disconnected', {});

            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.setConnectionState(ConnectionState.ERROR);
            this.handleMessage('error', { message: 'WebSocket connection error' });
            reject(new Error('WebSocket connection failed'));
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Received WebSocket message:', message);
                this.handleMessage(message.type, message.data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    // Установка состояния подключения
    private setConnectionState(state: ConnectionState): void {
        this.connectionState = state;
        console.log('Connection state changed to:', state);
    }

    // Запуск heartbeat
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                this.safeSendMessage('ping', {});
            }
        }, this.heartbeatInterval);
    }

    // Остановка heartbeat
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Планирование переподключения
    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        this.setConnectionState(ConnectionState.RECONNECTING);
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);

        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;

            try {
                if (this.gameId) {
                    await this.connect(this.gameId);
                    this.handleMessage('reconnected', {});
                }
            } catch (error) {
                console.error('Reconnect failed:', error);
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            }
        }, delay);
    }

    // Отключение
    async disconnect(): Promise<void> {
        this.stopHeartbeat();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Manual disconnect');
            this.socket = null;
        }

        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.gameId = null;
    }

    // Обработка сообщений
    private handleMessage(type: string, data: any): void {
        const handler = this.eventHandlers[type as keyof WebSocketEventHandlers];
        if (handler) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${type}:`, error);
            }
        } else {
            console.warn('Unhandled WebSocket message type:', type, data);
        }
    }

    // Отправка сообщения
    private sendMessage(type: string, data: any): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected, cannot send message:', type);
            throw new Error('WebSocket is not connected');
        }

        const message: WebSocketMessage = {
            type,
            data,
            timestamp: new Date().toISOString()
        };

        try {
            this.socket.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            throw error;
        }
    }

    // Безопасная отправка сообщения
    private safeSendMessage(type: string, data: any): boolean {
        try {
            this.sendMessage(type, data);
            return true;
        } catch (error) {
            console.error('Failed to send message:', type, error);
            return false;
        }
    }

    // Регистрация обработчиков событий
    on<K extends keyof WebSocketEventHandlers>(event: K, handler: WebSocketEventHandlers[K]): void {
        this.eventHandlers[event] = handler;
    }

    // Удаление обработчика события
    off<K extends keyof WebSocketEventHandlers>(event: K): void {
        delete this.eventHandlers[event];
    }

    // Удаление всех обработчиков
    removeAllListeners(): void {
        this.eventHandlers = {};
    }

    // ========== ИГРОВЫЕ МЕТОДЫ ==========

    // Отправка сообщения в чат
    sendChatMessage(content: string, isOOC: boolean = false, characterId?: string): boolean {
        return this.safeSendMessage('chat_message', {
            content: content.trim(),
            is_ooc: isOOC,
            character_id: characterId,
        });
    }

    // Отправка действия игрока
    sendPlayerAction(action: string, characterId?: string): boolean {
        return this.safeSendMessage('player_action', {
            action: action.trim(),
            character_id: characterId,
        });
    }

    // Бросок костей
    sendDiceRoll(notation: string, purpose?: string, characterId?: string, advantage?: boolean, disadvantage?: boolean): boolean {
        return this.safeSendMessage('dice_roll', {
            notation: notation.trim(),
            purpose: purpose?.trim(),
            character_id: characterId,
            advantage: advantage || false,
            disadvantage: disadvantage || false,
        });
    }

    // ✅ НОВЫЕ МЕТОДЫ: Запрос состояния игры

    // Запрос текущего состояния игры
    requestGameState(): boolean {
        return this.safeSendMessage('request_game_state', {
            timestamp: new Date().toISOString()
        });
    }

    // Запрос истории сообщений
    requestMessageHistory(limit: number = 50): boolean {
        return this.safeSendMessage('request_message_history', {
            limit,
            timestamp: new Date().toISOString()
        });
    }

    // Запрос информации о сцене
    requestSceneInfo(): boolean {
        return this.safeSendMessage('request_scene_info', {
            timestamp: new Date().toISOString()
        });
    }

    // Обновление инициативы
    sendInitiativeRoll(characterId: string): boolean {
        return this.safeSendMessage('initiative_roll', {
            character_id: characterId,
        });
    }

    // Следующий ход
    sendNextTurn(): boolean {
        return this.safeSendMessage('next_turn', {});
    }

    // ========== УТИЛИТЫ ==========

    // Проверка состояния подключения
    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN && this.connectionState === ConnectionState.CONNECTED;
    }

    // Проверка, идет ли подключение
    isConnecting(): boolean {
        return this.connectionState === ConnectionState.CONNECTING;
    }

    // Проверка, идет ли переподключение
    isReconnecting(): boolean {
        return this.connectionState === ConnectionState.RECONNECTING;
    }

    // Проверка наличия ошибки
    hasError(): boolean {
        return this.connectionState === ConnectionState.ERROR;
    }

    // Получить информацию о соединении
    getConnectionInfo(): {
        state: ConnectionState;
        gameId: string | null;
        reconnectAttempts: number;
        isConnected: boolean;
        hasToken: boolean;
        wsConfig: {
            wsUrl: string | undefined;
            wsHost: string | undefined;
            apiUrl: string | undefined;
        };
    } {
        return {
            state: this.connectionState,
            gameId: this.gameId,
            reconnectAttempts: this.reconnectAttempts,
            isConnected: this.isConnected(),
            hasToken: !!this.getAuthToken(),
            wsConfig: {
                wsUrl: import.meta.env.VITE_WS_URL,
                wsHost: import.meta.env.VITE_WS_HOST,
                apiUrl: import.meta.env.VITE_API_URL,
            },
        };
    }

    // Проверка наличия валидного токена
    hasValidToken(): boolean {
        const token = this.getAuthToken();
        return !!token && token.length > 0;
    }

    // Отладочная информация о токене
    debugTokenInfo(): void {
        console.log('Auth token info:', {
            hasAuthTokens: !!localStorage.getItem('auth_tokens'),
            hasSingleToken: !!localStorage.getItem('auth_token'),
            hasAuthStore: !!localStorage.getItem('auth-store'),
            tokenExists: !!this.getAuthToken(),
        });
    }

    // Отладочная информация о соединении
    debugConnectionInfo(): void {
        console.log('WebSocket connection info:', this.getConnectionInfo());
    }
}

// Экспортируем singleton
export const websocketService = new WebSocketService();
export default websocketService;