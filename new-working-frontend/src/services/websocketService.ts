// services/websocketService.ts - Исправленный WebSocket сервис с правильным хостом

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

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Правильное получение токена
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

    // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Правильное получение WebSocket URL
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
                // ✅ ИСПРАВЛЕНИЕ: Используем новый метод получения WebSocket URL
                const token = this.getAuthToken();
                if (!token) {
                    throw new Error('No authentication token found. Please log in first.');
                }

                const wsUrl = this.getWebSocketUrl(gameId, token);

                console.log('WebSocket URL:', wsUrl);
                console.log('Connecting to WebSocket:', wsUrl);
                this.socket = new WebSocket(wsUrl);

                // Таймаут для подключения
                const connectionTimeout = setTimeout(() => {
                    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
                        this.socket.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.socket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket connected to game:', gameId);
                    this.setConnectionState(ConnectionState.CONNECTED);
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();

                    // Отправляем сообщение о подключении
                    this.sendMessage('join_game', { game_id: gameId });

                    // Уведомляем обработчики
                    if (this.eventHandlers.connected) {
                        this.eventHandlers.connected({ game_id: gameId });
                    }

                    resolve();
                };

                this.socket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error, event.data);
                    }
                };

                this.socket.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket connection closed:', event.code, event.reason);
                    this.setConnectionState(ConnectionState.DISCONNECTED);
                    this.stopHeartbeat();

                    if (this.eventHandlers.disconnected) {
                        this.eventHandlers.disconnected();
                    }

                    // Автоматическое переподключение для неожиданных разрывов
                    if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('WebSocket error:', error);
                    this.setConnectionState(ConnectionState.ERROR);

                    if (this.eventHandlers.error) {
                        this.eventHandlers.error({
                            message: 'WebSocket connection error',
                            error: error
                        });
                    }

                    reject(new Error('WebSocket connection failed'));
                };

            } catch (error) {
                this.setConnectionState(ConnectionState.ERROR);
                reject(error);
            }
        });
    }

    // Отключение
    async disconnect(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopHeartbeat();

        if (this.socket) {
            // Отправляем сообщение о выходе
            if (this.socket.readyState === WebSocket.OPEN) {
                this.sendMessage('leave_game', { game_id: this.gameId });

                // Ждем немного для отправки сообщения
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.socket.close(1000, 'User disconnected');
            this.socket = null;
        }

        this.gameId = null;
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.eventHandlers = {};
        this.reconnectAttempts = 0;
    }

    // Установка состояния подключения
    private setConnectionState(state: ConnectionState): void {
        const oldState = this.connectionState;
        this.connectionState = state;

        if (oldState !== state) {
            console.log('Connection state changed:', oldState, '->', state);
        }
    }

    // Попытка переподключения
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.setConnectionState(ConnectionState.ERROR);
            return;
        }

        this.reconnectAttempts++;
        this.setConnectionState(ConnectionState.RECONNECTING);

        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        this.reconnectTimer = setTimeout(async () => {
            if (this.gameId) {
                try {
                    await this.connect(this.gameId);
                    if (this.eventHandlers.reconnected) {
                        this.eventHandlers.reconnected();
                    }
                } catch (error) {
                    console.error('Reconnection failed:', error);
                    this.attemptReconnect();
                }
            }
        }, delay);
    }

    // Heartbeat для поддержания соединения
    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.sendMessage('ping', { timestamp: Date.now() });
            }
        }, this.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Обработка входящих сообщений
    private handleMessage(message: WebSocketMessage): void {
        const { type, data } = message;

        // Обработка системных сообщений
        if (type === 'pong') {
            // Ответ на ping - соединение активно
            return;
        }

        if (type === 'error') {
            console.error('WebSocket server error:', data);
        }

        // Вызываем соответствующий обработчик
        if (this.eventHandlers[type as keyof WebSocketEventHandlers]) {
            try {
                this.eventHandlers[type as keyof WebSocketEventHandlers]!(data);
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

    // ✅ НОВЫЙ МЕТОД: Проверка наличия валидного токена
    hasValidToken(): boolean {
        const token = this.getAuthToken();
        return !!token;
    }

    // ✅ НОВЫЙ МЕТОД: Для дебага - показать информацию о токенах
    debugTokenInfo(): void {
        console.group('WebSocket Token Debug Info');

        const authTokens = localStorage.getItem('auth_tokens');
        console.log('auth_tokens:', authTokens ? JSON.parse(authTokens) : 'not found');

        const authToken = localStorage.getItem('auth_token');
        console.log('auth_token:', authToken || 'not found');

        const authStore = localStorage.getItem('auth-store');
        console.log('auth-store:', authStore ? JSON.parse(authStore) : 'not found');

        const currentToken = this.getAuthToken();
        console.log('Current token:', currentToken ? 'found' : 'not found');

        console.groupEnd();
    }

    // ✅ ОБНОВЛЕННЫЙ МЕТОД: Для дебага URL и подключения
    debugConnectionInfo(): void {
        console.group('WebSocket Connection Debug Info');

        const token = this.getAuthToken();

        console.log('Environment variables:');
        console.log('  VITE_WS_URL:', import.meta.env.VITE_WS_URL);
        console.log('  VITE_WS_HOST:', import.meta.env.VITE_WS_HOST);
        console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);

        console.log('Current state:');
        console.log('  Game ID:', this.gameId);
        console.log('  Has token:', !!token);
        console.log('  Connection state:', this.connectionState);

        console.log('Browser info:');
        console.log('  window.location.host:', window.location.host);
        console.log('  window.location.hostname:', window.location.hostname);
        console.log('  window.location.protocol:', window.location.protocol);

        if (this.gameId && token) {
            const wsUrl = this.getWebSocketUrl(this.gameId, token);
            console.log('Calculated WebSocket URL:', wsUrl);
        }

        console.groupEnd();
    }

    // Принудительное переподключение
    forceReconnect(): void {
        if (this.gameId) {
            this.reconnectAttempts = 0;
            this.connect(this.gameId).catch(error => {
                console.error('Force reconnect failed:', error);
            });
        }
    }

    // Сброс счетчика попыток переподключения
    resetReconnectAttempts(): void {
        this.reconnectAttempts = 0;
    }
}

// Экспорт синглтона
export const websocketService = new WebSocketService();
export default websocketService;