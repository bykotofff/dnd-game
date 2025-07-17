// new-working-frontend/src/services/api.ts - ПОЛНАЯ ОБНОВЛЕННАЯ ВЕРСИЯ

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { getFromStorage, setToStorage, removeFromStorage } from '@/utils';
import type { AuthTokens, ApiResponse } from '@/types';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({
            // ✅ ИСПРАВЛЕНИЕ: правильная настройка baseURL для dev и production
            baseURL: `${API_BASE_URL}/api`,
            timeout: 60000, // ✅ Увеличиваем таймаут до 60 секунд
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor to add auth token
        this.api.interceptors.request.use(
            (config) => {
                // ✅ Добавляем логирование запросов в development
                if (import.meta.env.DEV) {
                    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
                }

                const tokens = this.getTokens();
                if (tokens?.access_token) {
                    config.headers.Authorization = `Bearer ${tokens.access_token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor to handle token refresh and errors
        this.api.interceptors.response.use(
            (response) => {
                // ✅ Логирование успешных ответов в development
                if (import.meta.env.DEV) {
                    console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
                }
                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // ✅ Улучшенное логирование ошибок
                if (import.meta.env.DEV) {
                    console.error('❌ API Error:', {
                        method: originalRequest?.method?.toUpperCase(),
                        url: originalRequest?.url,
                        status: error.response?.status,
                        message: error.message,
                        data: error.response?.data,
                    });
                }

                // ✅ Обработка таймаута
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    console.error('⏰ Request timeout:', originalRequest?.url);
                    return Promise.reject(new Error(`Запрос превысил время ожидания (${this.api.defaults.timeout}ms). Попробуйте позже.`));
                }

                // Handle 401 Unauthorized
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    const tokens = this.getTokens();
                    if (tokens?.refresh_token) {
                        try {
                            const newTokens = await this.refreshToken(tokens.refresh_token);
                            this.setTokens(newTokens);
                            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
                            return this.api(originalRequest);
                        } catch (refreshError) {
                            console.error('Token refresh failed:', refreshError);
                            this.clearTokens();

                            // ✅ Перенаправляем на логин только если не находимся уже там
                            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                                window.location.href = '/login';
                            }
                        }
                    } else {
                        this.clearTokens();
                        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                            window.location.href = '/login';
                        }
                    }
                }

                // ✅ Улучшенная обработка других ошибок
                return Promise.reject(this.formatError(error));
            }
        );
    }

    // ✅ Новый метод для форматирования ошибок
    private formatError(error: AxiosError): Error {
        const response = error.response;

        if (response?.data) {
            const data = response.data as any;

            // Обработка разных форматов ошибок с сервера
            if (data.detail) {
                return new Error(data.detail);
            }
            if (data.message) {
                return new Error(data.message);
            }
            if (data.error) {
                return new Error(data.error);
            }
        }

        // Стандартные HTTP коды ошибок
        switch (response?.status) {
            case 400:
                return new Error('Некорректный запрос');
            case 401:
                return new Error('Необходима авторизация');
            case 403:
                return new Error('Доступ запрещен');
            case 404:
                return new Error('Ресурс не найден');
            case 422:
                return new Error('Ошибка валидации данных');
            case 429:
                return new Error('Слишком много запросов. Попробуйте позже');
            case 500:
                return new Error('Ошибка сервера. Попробуйте позже');
            case 502:
                return new Error('Сервер временно недоступен');
            case 503:
                return new Error('Сервис временно недоступен');
            case 504:
                return new Error('Превышено время ожидания ответа от сервера');
            default:
                return new Error(error.message || 'Произошла неизвестная ошибка');
        }
    }

    // Token management
    private setTokens(tokens: AuthTokens): void {
        setToStorage('auth_tokens', tokens);
    }

    private getTokens(): AuthTokens | null {
        return getFromStorage('auth_tokens');
    }

    private clearTokens(): void {
        removeFromStorage('auth_tokens');
    }

    // Auth methods
    async login(credentials: {
        username: string;
        password: string;
    }): Promise<AuthTokens> {
        const response = await this.api.post<AuthTokens>('/auth/login', credentials);
        this.setTokens(response.data);
        return response.data;
    }

    async register(userData: {
        username: string;
        email: string;
        password: string;
        display_name?: string;
    }): Promise<AuthTokens> {
        const response = await this.api.post<AuthTokens>('/auth/register', userData);
        this.setTokens(response.data);
        return response.data;
    }

    async logout(): Promise<void> {
        try {
            await this.api.post('/auth/logout');
        } finally {
            this.clearTokens();
        }
    }

    private async refreshToken(refreshToken: string): Promise<AuthTokens> {
        const response = await this.api.post<AuthTokens>('/auth/refresh', {
            refresh_token: refreshToken,
        });
        return response.data;
    }

    async getCurrentUser() {
        const response = await this.api.get('/auth/me');
        return response.data;
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        await this.api.post('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
        });
    }

    // ✅ Специальный метод для критичных запросов с повышенным таймаутом
    async getWithExtendedTimeout<T>(url: string, params?: any, timeoutMs: number = 120000): Promise<T> {
        const response = await this.api.get<T>(url, {
            params,
            timeout: timeoutMs,
        });
        return response.data;
    }

    async postWithExtendedTimeout<T>(url: string, data?: any, timeoutMs: number = 120000): Promise<T> {
        const response = await this.api.post<T>(url, data, {
            timeout: timeoutMs,
        });
        return response.data;
    }

    // Generic API methods
    async get<T>(url: string, params?: any): Promise<T> {
        // ✅ ИСПРАВЛЕНИЕ: Проверяем что url это строка
        if (typeof url !== 'string') {
            console.error('❌ Invalid URL passed to get method:', url);
            throw new Error('Invalid URL provided');
        }

        const response = await this.api.get<T>(url, { params });
        return response.data;
    }

    async post<T>(url: string, data?: any): Promise<T> {
        // ✅ ИСПРАВЛЕНИЕ: Проверяем что url это строка
        if (typeof url !== 'string') {
            console.error('❌ Invalid URL passed to post method:', url);
            throw new Error('Invalid URL provided');
        }

        const response = await this.api.post<T>(url, data);
        return response.data;
    }

    async put<T>(url: string, data?: any): Promise<T> {
        // ✅ ИСПРАВЛЕНИЕ: Проверяем что url это строка
        if (typeof url !== 'string') {
            console.error('❌ Invalid URL passed to put method:', url);
            throw new Error('Invalid URL provided');
        }

        const response = await this.api.put<T>(url, data);
        return response.data;
    }

    async patch<T>(url: string, data?: any): Promise<T> {
        // ✅ ИСПРАВЛЕНИЕ: Проверяем что url это строка
        if (typeof url !== 'string') {
            console.error('❌ Invalid URL passed to patch method:', url);
            throw new Error('Invalid URL provided');
        }

        const response = await this.api.patch<T>(url, data);
        return response.data;
    }

    async delete<T>(url: string): Promise<T> {
        // ✅ ИСПРАВЛЕНИЕ: Проверяем что url это строка
        if (typeof url !== 'string') {
            console.error('❌ Invalid URL passed to delete method:', url);
            throw new Error('Invalid URL provided');
        }

        const response = await this.api.delete<T>(url);
        return response.data;
    }

    // File upload method
    async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.api.post<T>(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 минут для загрузки файлов
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return response.data;
    }

    // ✅ Health check с простой обработкой ошибок
    async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
        try {
            // Для health check используем прямой URL без proxy
            const response = await axios.get(`${API_BASE_URL}/health`, {
                timeout: 10000, // Короткий таймаут для health check
            });
            return response.data;
        } catch (error) {
            console.error('Health check failed:', error);
            throw new Error('Сервер недоступен');
        }
    }

    // Get auth status without making request if no token
    isAuthenticated(): boolean {
        const tokens = this.getTokens();
        return !!tokens?.access_token;
    }

    // Get base URL for static files
    getStaticUrl(path: string): string {
        return `${API_BASE_URL}/static/${path}`;
    }

    // ✅ Метод для проверки доступности сервера
    async checkServerAvailability(): Promise<boolean> {
        try {
            await this.healthCheck();
            return true;
        } catch {
            return false;
        }
    }

    // ✅ Retry механизм для критичных запросов
    async retryRequest<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error: any) {
                lastError = error;

                // Не ретраим 401, 403, 404 ошибки
                if (error.response?.status && [401, 403, 404].includes(error.response.status)) {
                    throw error;
                }

                if (attempt < maxRetries) {
                    console.log(`Попытка ${attempt} не удалась, повторяем через ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                } else {
                    console.error(`Все ${maxRetries} попыток не удались`);
                }
            }
        }

        throw lastError!;
    }

    // ✅ Утилиты для отладки
    getBaseUrl(): string {
        return this.api.defaults.baseURL || '';
    }

    getCurrentTimeout(): number {
        return this.api.defaults.timeout || 0;
    }

    // ✅ Методы для работы с WebSocket URL
    getWebSocketUrl(): string {
        return API_BASE_URL.replace('http', 'ws');
    }

    // ✅ Метод для формирования полных URL
    getFullUrl(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_BASE_URL}/api${cleanPath}`;
    }

    // ✅ Метод для загрузки файлов
    async downloadFile(url: string, filename?: string): Promise<void> {
        try {
            const response = await this.api.get(url, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('File download failed:', error);
            throw error;
        }
    }

    // ✅ Утилиты для работы с токенами авторизации
    setAuthToken(token: string): void {
        this.setTokens({ access_token: token, refresh_token: '', token_type: 'bearer' });
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    removeAuthToken(): void {
        this.clearTokens();
        delete this.api.defaults.headers.common['Authorization'];
    }

    getAuthToken(): string | null {
        const tokens = this.getTokens();
        return tokens?.access_token || null;
    }

    // ✅ Метод для изменения базового URL (полезно для разработки)
    setBaseUrl(baseUrl: string): void {
        this.api.defaults.baseURL = `${baseUrl}/api`;
    }

    // ✅ Метод для изменения таймаута
    setTimeout(timeout: number): void {
        this.api.defaults.timeout = timeout;
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;