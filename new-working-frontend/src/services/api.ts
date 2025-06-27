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
            baseURL: import.meta.env.DEV ? '/api' : `${API_BASE_URL}/api`,
            timeout: 30000,
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
                const tokens = this.getTokens();
                if (tokens?.access_token) {
                    config.headers.Authorization = `Bearer ${tokens.access_token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor to handle token refresh
        this.api.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

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
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return response.data;
    }

    // Health check
    async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
        // Для health check используем прямой URL без proxy
        const response = await axios.get(`${API_BASE_URL}/health`);
        return response.data;
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;