import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiService } from '@/services/api';
import type { User, AuthTokens, LoginCredentials, RegisterData } from '@/types';

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
    updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Login action
            login: async (credentials: LoginCredentials) => {
                set({ isLoading: true, error: null });

                try {
                    const tokens = await apiService.login(credentials);
                    const user = await apiService.getCurrentUser();

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    const errorMessage = error.response?.data?.detail || 'Ошибка входа';
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: errorMessage,
                    });
                    throw error;
                }
            },

            // Register action
            register: async (data: RegisterData) => {
                set({ isLoading: true, error: null });

                try {
                    const tokens = await apiService.register(data);
                    const user = await apiService.getCurrentUser();

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    const errorMessage = error.response?.data?.detail || 'Ошибка регистрации';
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: errorMessage,
                    });
                    throw error;
                }
            },

            // Logout action
            logout: async () => {
                set({ isLoading: true });

                try {
                    await apiService.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                }
            },

            // Refresh user data
            refreshUser: async () => {
                if (!apiService.isAuthenticated()) {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                    return;
                }

                set({ isLoading: true });

                try {
                    const user = await apiService.getCurrentUser();
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    console.error('Failed to refresh user:', error);
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                }
            },

            // Clear error
            clearError: () => {
                set({ error: null });
            },

            // Update user data locally
            updateUser: (updates: Partial<User>) => {
                const { user } = get();
                if (user) {
                    set({
                        user: { ...user, ...updates },
                    });
                }
            },
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Selector hooks for convenience
export const useAuth = () => {
    const store = useAuthStore();
    return {
        user: store.user,
        isAuthenticated: store.isAuthenticated,
        isLoading: store.isLoading,
        error: store.error,
    };
};

export const useAuthActions = () => {
    const store = useAuthStore();
    return {
        login: store.login,
        register: store.register,
        logout: store.logout,
        refreshUser: store.refreshUser,
        clearError: store.clearError,
        updateUser: store.updateUser,
    };
};