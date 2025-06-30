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
                    return Promise.reject(new Error(`Запрос превысил время ожидания (${this.api.defaults.timeout}ms). Проверьте подключение к серверу.`));
                }

                // ✅ Обработка сетевых ошибок
                if (error.code === 'ERR_NETWORK' || !error.response) {
                    console.error('🌐 Network error:', error.message);
                    return Promise.reject(new Error('Ошибка сети. Проверьте подключение к интернету и доступность сервера.'));
                }

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const tokens = this.getTokens();
                        if (tokens?.refresh_token) {
                            const newTokens = await this.refreshToken(tokens.refresh_token);
                            this.setTokens(newTokens);

                            // Retry original request with new token
                            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
                            return this.api(originalRequest);
                        }
                    } catch (refreshError) {
                        // Refresh failed, logout user
                        this.clearTokens();
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                }

                // ✅ Обработка 404 ошибок для игр
                if (error.response?.status === 404 && originalRequest?.url?.includes('/games/')) {
                    return Promise.reject(new Error('Игра не найдена или была удалена'));
                }

                // ✅ Обработка 403 ошибок
                if (error.response?.status === 403) {
                    return Promise.reject(new Error('Недостаточно прав для выполнения этого действия'));
                }

                // ✅ Обработка 500 ошибок
                if (error.response?.status >= 500) {
                    return Promise.reject(new Error('Ошибка сервера. Попробуйте позже'));
                }

                return Promise.reject(error);
            }
        );
    }

    // Token management
    private getTokens(): AuthTokens | null {
        return getFromStorage<AuthTokens | null>('auth_tokens', null);
    }

    private setTokens(tokens: AuthTokens): void {
        setToStorage('auth_tokens', tokens);
    }

    private clearTokens(): void {
        removeFromStorage('auth_tokens');
    }

    // Auth methods
    async login(credentials: { username: string; password: string }): Promise<AuthTokens> {
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
        const response = await this.api.get<T>(url, { params });
        return response.data;
    }

    async post<T>(url: string, data?: any): Promise<T> {
        const response = await this.api.post<T>(url, data);
        return response.data;
    }

    async put<T>(url: string, data?: any): Promise<T> {
        const response = await this.api.put<T>(url, data);
        return response.data;
    }

    async patch<T>(url: string, data?: any): Promise<T> {
        const response = await this.api.patch<T>(url, data);
        return response.data;
    }

    async delete<T>(url: string): Promise<T> {
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;